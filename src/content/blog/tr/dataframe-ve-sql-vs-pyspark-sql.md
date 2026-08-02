---
title: 'Aynı SELECT, Bambaşka Bir Motor: DataFrame Nedir, PySpark Neden Var?'
description: 'spark.sql("SELECT ...") satırındaki SELECT, yıllardır Oracle''da ya da PostgreSQL''de yazdığınızla aynı — peki onu saran PySpark ne işe yarıyor? DataFrame kavramından pandas ile Spark DataFrame farkına, dönüşümü neden salt SQL ile yazmadığımızdan sektördeki SQL/PySpark dengesine; ve en önemlisi, aynı sözdiziminin altında motoru, verinin durduğu yeri ve ölçekleme modelini tamamen değiştiren ayrıma — klasik SQL refleksleriyle kurulan bir yazı.'
pubDate: 2026-07-12
tags: ['DataFrame', 'PySpark', 'Spark SQL', 'SQL', 'Veri Mühendisliği', 'Backend']
draft: false
---

Yıllarca Oracle ya da PostgreSQL'de SQL yazmış biri, bir Spark not defterinde ilk kez şu
satırla karşılaşınca bir an durur:

```python
spark.sql("SELECT musteri_id, SUM(tutar) FROM siparisler GROUP BY musteri_id")
```

İçindeki `SELECT`, yıllardır yazdığı `SELECT`'in tıpkısı. O halde onu saran `spark.sql(...)`
nedir? İşin daha da kafa karıştıran yanı: her işlem bir **DataFrame** üzerinden dönüyor —
veri ona okunuyor, onun üstünde dönüştürülüyor, ondan yazılıyor. Aynı SQL, ama bambaşka bir
dünyanın içinde.

Bu yazı iki soruyu klasik SQL refleksleriyle kıyaslayarak baştan kuruyor: **DataFrame denen
bu yapı tam olarak nedir? Ve madem aynı SELECT'i yazıyoruz, dönüşümü neden salt SQL ile
değil de PySpark'ın içinde yazıyoruz?**

## Önce DataFrame nedir?

En yalın haliyle: **DataFrame, veriyi satır ve sütunlardan oluşan iki boyutlu bir tablo
biçiminde tutan veri yapısıdır.** Excel'deki bir sayfa ya da veritabanındaki bir tablo gibi
düşünülebilir — her sütunun bir **adı** ve bir **veri tipi** vardır; her satır bir **kaydı**
temsil eder.

```
+-------------+-----------+---------+
| musteri_id  | sehir     | tutar   |   ← sütunlar (ad + tip)
+-------------+-----------+---------+
| 1001        | Ankara    | 250.00  |   ← her satır bir kayıt
| 1002        | İzmir     | 90.50   |
| 1003        | Ankara    | 400.00  |
+-------------+-----------+---------+
```

Veritabanı tablosundan ayrıldığı nokta şu: DataFrame kalıcı bir disk nesnesi değil, çoğu
zaman **programın belleğinde yaşayan** bir yapıdır. Asıl gücü de buradan gelir — DataFrame,
yapılandırılmış veriyi **programatik olarak** işlemenin en ergonomik yoludur. SQL'in
sorgulama gücünü (filtrele, grupla, join'le, pivotla) alır, üstüne bir programlama dilinin
esnekliğini (değişken, döngü, koşul, fonksiyon) ekler. İki dünyanın kesişimidir.

En yaygın üç implementasyonu var:

- **pandas (Python):** En bilinen DataFrame. `pd.DataFrame()` ile oluşturulur; filtreleme,
  gruplama, join, pivot gibi işlemler SQL'e çok benzer biçimde yapılır. **Tek makinede,
  belleğin sınırları içinde** çalışır — veri RAM'e sığdığı sürece son derece etkilidir.
- **Spark DataFrame (PySpark):** pandas'ın **dağıtık** karşılığı sayılabilir. Veri
  cluster'daki node'lara dağıtılır; böylece **milyarlarca satır** işlenebilir. Bir
  lakehouse'daki bronz → gümüş → altın dönüşümlerini yürüten yapı tam olarak budur.
- **data.frame / tibble (R):** R'ın native veri yapısı; özellikle istatistiksel analizde
  yaygındır.

## pandas DataFrame ile Spark DataFrame aynı şey mi?

Kavramsal olarak evet — ikisi de satır-sütun tablosudur. Ama çalışma modelleri bambaşkadır
ve bu fark, ileride SQL ile PySpark tartışmasının da temelini oluşturur.

| Kriter | pandas DataFrame | Spark DataFrame |
| --- | --- | --- |
| **Nerede çalışır** | Tek makine, tek process | Cluster — veri node'lara dağıtık |
| **Ölçek** | RAM'e sığan kadar (GB'lar) | Terabaytlar, milyarlarca satır |
| **Değerlendirme** | Eager — her satır anında çalışır | Lazy — plan biriktirilir, action'da çalışır |
| **Değiştirilebilirlik** | Mutable — yerinde değiştirilir | Immutable — her dönüşüm yeni DataFrame üretir |

En kritik satır, sondan bir önceki: **lazy evaluation.** pandas'ta bir filtre yazdığınız an
çalışır. Spark'ta ise `filter`, `join`, `groupBy` gibi dönüşümler hemen çalışmaz; Spark
bunları bir **plan** olarak biriktirir ve ancak `count`, `write`, `show` gibi bir **action**
geldiğinde tüm zinciri optimize edip tek seferde çalıştırır. Dağıtık dünyada verinin
gereksiz yere node'lar arasında dolaşmasını önleyen temel mekanizma budur — birazdan
Catalyst optimizer'a gelince yeniden karşımıza çıkacak.

## Bunu neden salt SQL ile değil de PySpark ile yapıyoruz?

Önce yaygın bir yanılgıyı düzeltmek gerekiyor: **mesele SQL'in yetersiz kalması değil.**
Aynı dönüşümlerin çok büyük bölümü Spark SQL ile de yazılabilir. Mesele, bazı senaryolarda
PySpark'ın daha uygun bir araç olmasıdır. SQL'in tek başına zorlandığı yerler şunlar:

- **Karmaşık kontrol akışı:** `if/else` dallanmaları, döngüler, `try/except` ile hata
  yönetimi, retry mantığı… SQL'de bunlar ya hiç yapılamaz ya da çok dolambaçlı olur.
- **Çok kaynaklı okuma/yazma:** SQL tek başına "Kafka'dan oku, Iceberg'e yaz" diyemez.
  Bunun için bir **execution engine** gerekir — veriyi nereden alıp nereye koyacağını
  yöneten bir katman.
- **Programatik müdahale gerektiren işler:** schema evolution, veri kalitesi kontrolleri,
  dinamik partition yönetimi gibi işlemler koşullu, programlanabilir bir mantık ister.
- **Ekosisteme erişim:** UDF yazmak, bir ML pipeline'ını entegre etmek, Python
  kütüphanelerine uzanmak — hepsi programlama dili tarafını gerektirir.

PySpark'ın asıl farkı da burada ortaya çıkar: **PySpark yalnızca bir "sorgulama dili"
değil, bir orkestrasyon katmanıdır.** Veriyi nereden okuyacağınızı, nasıl
dönüştüreceğinizi, nereye yazacağınızı ve hata olursa ne yapacağınızı **tek bir programda**
tanımlarsınız. SQL ise bu pipeline'ın içinde bir **araç** olarak kullanılır.

Pratikte ikisi zaten birlikte çalışır. Tipik bir işte iskelet Python'da, dönüşüm SQL'de
durur:

```python
# 1) NEREDEN OKU — bunu SQL tek başına yapamaz
ham = spark.read.format("kafka").option("subscribe", "siparisler").load()
ham.createOrReplaceTempView("ham_olaylar")

# 2) DÖNÜŞTÜR — burası tertemiz SQL
temiz = spark.sql("""
    SELECT musteri_id, sehir, SUM(tutar) AS toplam
    FROM ham_olaylar
    WHERE tutar > 0
    GROUP BY musteri_id, sehir
""")

# 3) NEREYE YAZ + HATA YÖNETİMİ — yine Python tarafı
try:
    temiz.write.format("iceberg").mode("append").save("gumus.siparis_ozet")
except AnalysisException as e:
    log.error(f"Yazma başarısız, retry kuyruğuna alındı: {e}")
```

> Kısacası: **SQL "ne yapılacağını" söyler; PySpark ise "ne + nasıl + nereye + hata olursa
> ne olacak" sorularının tamamını bir arada yönetir.** SQL'in tek başına kuramadığı,
> pipeline'ı ayakta tutan iskelet PySpark'tır.

## Gerçek hayatta ne kadar SQL, ne kadar PySpark?

Bu oran projeye ve ekibe göre epey değişir, ama genel bir çerçeve çizilebilir. Tipik bir
lakehouse / ETL projesinde dönüşüm mantığının büyük kısmı — filtreleme, join, gruplama,
window function, `CASE WHEN` — **SQL ile** yazılır. PySpark DataFrame API'siyle yazılan
kısım genelde pipeline iskeleti, I/O ve edge-case yönetimidir. Kabaca **%60–70 SQL,
%30–40 PySpark** demek yanlış olmaz.

Peki bu oran nerede kayar?

| Ekip / bağlam | SQL | PySpark | Neden |
| --- | --- | --- | --- |
| **dbt kullanan ekipler** | ~%90+ | ~%10 | Tüm dönüşüm SQL'de; orkestrasyonu dbt + Airflow halleder |
| **Tipik lakehouse / ETL** | %60–70 | %30–40 | Dönüşüm SQL'de, iskelet ve I/O PySpark'ta |
| **ML / karmaşık veri müh.** | ~%50 | ~%50+ | Feature engineering, streaming, model serving Python ister |

Databricks/Spark ortamında çalışan çoğu veri mühendisinin günlük pratiği aslında bu
tablonun özetidir: not defterinde `spark.sql("""...""")` yazar, etrafını Python ile
sararlar. Yani **SQL yazarlar, ama PySpark'ın içinde yazarlar.**

Bir lakehouse'un bronz → gümüş → altın dönüşümlerinde de manzara benzerdir: dönüşüm
mantığının çoğu Spark SQL ile yazılır; Kafka'dan okuma, Iceberg'e yazma, schema kontrolü
gibi kısımlar PySpark ile yönetilir. Sonuç olarak sektörde **ağırlık hâlâ SQL'dedir.**
PySpark'ın gücü SQL'in yerine geçmek değil, SQL'in tek başına yapamadığı kısmı
tamamlamaktır.

## Peki PySpark SQL ile klasik SQL'in farkı ne?

Şimdi en sık karıştırılan noktaya geldik. İkisinde de **neredeyse birebir aynı SQL
sözdizimini** yazarsınız. Fark, sorgunun *nerede* ve *nasıl* çalıştığındadır.

**Klasik SQL (Oracle, PostgreSQL…).** Sorguyu veritabanı motoruna gönderirsiniz; motor,
kendi içindeki veri üzerinde kendi optimizer'ıyla çalışır. Veri tek bir sunucuda durur
(Oracle RAC gibi yapılarda sınırlı bir dağıtım söz konusudur). Bir kurumdaki klasik PL/SQL
prosedürleri tam bu modeldir — onları Oracle'ın kendi motoru çalıştırır.

```sql
-- Klasik SQL: motor = veritabanının kendisi, veri veritabanında
SELECT musteri_id, SUM(tutar)
FROM siparisler
GROUP BY musteri_id;
```

**PySpark SQL (`spark.sql()`).** Aynı SQL'i yazarsınız, ama onu çalıştıran motor
**Spark**'tır. Veri bir veritabanında durmaz; onu bir dosyadan ya da topic'ten okuyup
geçici bir görünüme (view) kaydeder, SQL'i onun üstünde yazarsınız.

```python
# PySpark SQL: aynı SQL, ama motor = Spark, veri dağıtık
spark.read.parquet("s3://veri/siparisler").createOrReplaceTempView("siparisler")
spark.sql("SELECT musteri_id, SUM(tutar) FROM siparisler GROUP BY musteri_id")
```

Sözdizimi neredeyse aynı olsa da altta dört şey kökten değişir:

- **Dağıtık çalışma.** Klasik motor sorguyu tek sunucuda koşturur. Spark ise sorguyu
  cluster'daki birden fazla node'a bölüp paralel işler. Oracle tek sunucuda 1 milyar
  satırı zorlanarak işlerken, Spark aynı işi 10 node'a dağıtıp çok daha kısa sürede
  bitirebilir.
- **Veri kaynağı esnekliği.** Oracle SQL yalnızca Oracle tablolarını sorgular. Spark SQL
  ile bir Kafka topic'ini, bir Iceberg tablosunu, bir Parquet dosyasını ve bir CSV'yi
  **aynı sorgu içinde join'leyebilirsiniz** — hepsi farklı yerlerde dursa bile.
- **Temp view mantığı.** Spark'ta kalıcı bir veritabanı şart değildir. Önce veriyi okuyup
  `createOrReplaceTempView("tablo")` dersiniz, sonra `spark.sql("SELECT * FROM tablo")`
  yazarsınız. Yani SQL'i **bellekteki geçici tablolar** üzerinde koşturursunuz.
- **Farklı optimizer.** Oracle'ın maliyet tabanlı optimizer'ı (CBO) vardır; Spark'ın
  **Catalyst** optimizer'ı. İkisi aynı sorgu için farklı planlar çıkarır, farklı
  stratejiler uygular. (Yukarıda konuştuğumuz lazy evaluation'ın karşılığını Catalyst tam
  burada verir: tüm dönüşüm zincirini bir bütün olarak görüp tek bir optimize plana
  indirir.)

| Kriter | Klasik SQL (Oracle/PostgreSQL) | PySpark SQL (`spark.sql`) |
| --- | --- | --- |
| **Motor** | Veritabanının kendi motoru + CBO | Spark + Catalyst optimizer |
| **Veri nerede** | Veritabanında, tek sunucuda | Cluster'daki node'lara dağıtık |
| **Ölçekleme** | Dikey (daha güçlü sunucu) | Yatay (cluster'a node ekle) |
| **Veri kaynağı** | Sadece kendi tabloları | Kafka, Iceberg, Parquet, CSV… aynı sorguda |
| **Tablo** | Kalıcı şema nesnesi | `createOrReplaceTempView` ile bellekte geçici view |
| **Çalıştırma** | Genelde eager | Lazy — plan kurulur, action'da çalışır |

> Özetle: yazdığınız SQL neredeyse aynıdır; ama **altındaki motor, verinin durduğu yer ve
> ölçekleme modeli tamamen farklıdır.** Klasik SQL, veriyi kendi evinde sorgular; Spark
> SQL ise veriyi nereden gelirse gelsin toplar ve dağıtık bir kümenin gücüyle işler.

## Özet: bir yapı, iki SQL, bir orkestratör

Üç parçayı birbirine bağlayalım. **DataFrame**, yapılandırılmış veriyi programatik olarak
tutmanın ergonomik yoludur — pandas'ta tek makinede, Spark'ta cluster'a dağıtık halde. Bu
dağıtık yapıyla konuşmanın **iki yolu** var: DataFrame API (`df.groupBy(...).agg(...)`) ve
SQL (`spark.sql("...")`) — ikisi de aynı Catalyst motoruna iner; aralarındaki seçim çoğu
zaman tercih meselesidir.

**SQL ile PySpark SQL** ayrımı ise sözdiziminde değil, motordadır: aynı SELECT, ama biri
veritabanının tek sunucusunda, diğeri Spark'ın dağıtık cluster'ında koşar. **Salt SQL mi,
PySpark mı** tartışmasının da aslında bir kazananı yok — çünkü ikisi rakip değil,
katmandır: SQL dönüşümün "ne"sini yazar; PySpark okuma, yazma, hata yönetimi ve akış
kontrolüyle pipeline'ın iskeletini tutar. Sektörün "%60–70 SQL, gerisi PySpark" pratiği de
tam bunu söyler: **ağırlık hâlâ SQL'dedir; PySpark ise onu tek başına yapamadığı işlere
taşıyan araçtır.**
