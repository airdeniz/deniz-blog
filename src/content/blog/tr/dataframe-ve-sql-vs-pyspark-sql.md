---
title: 'DataFrame Nedir, ve Aynı SQL''i Neden Bir de PySpark İçinde Yazarız?'
description: 'Oracle ya da PostgreSQL''den gelen biri, ilk kez spark.sql("SELECT ...") satırını görünce durur: içindeki SELECT yıllardır yazdığıyla aynı. Peki o sarmalayan PySpark ne, ve herkesin elden ele gezdirdiği "DataFrame" nedir? DataFrame kavramı, pandas ile Spark DataFrame farkı, dönüşümü neden salt SQL ile değil de PySpark ile yazdığımız, gerçek hayatta ne kadar SQL ne kadar PySpark yazıldığı ve en önemlisi: aynı sözdizimi olsa da klasik SQL ile PySpark SQL''i ayıran motor, verinin durduğu yer ve ölçekleme farkı — klasik SQL reflekslerinden kurulan bir yazı.'
pubDate: 2026-07-12
tags: ['DataFrame', 'PySpark', 'Spark SQL', 'SQL', 'Veri Mühendisliği', 'Backend']
draft: false
---

Yıllarca Oracle ya da PostgreSQL'de SQL yazmış biri, ilk kez bir Spark not defterinde şu satırı
görünce bir an durur:

```python
spark.sql("SELECT musteri_id, SUM(tutar) FROM siparisler GROUP BY musteri_id")
```

İçindeki `SELECT` tıpatıp yıllardır yazdığı `SELECT`. Peki o zaman onu saran `spark.sql(...)`
ne? Ve daha kafa karıştırıcısı: herkes ortalıkta bir **"DataFrame"** gezdiriyor — veriyi ona
okuyor, onun üstünde dönüştürüyor, ondan yazıyor. Aynı SQL, ama bambaşka bir dünyanın içinde.

Bu yazı iki soruyu klasik SQL refleksleriyle kıyaslayarak baştan kuruyor: **DataFrame denen bu
yapı tam olarak nedir, ve madem aynı SELECT'i yazıyoruz, dönüşümü neden salt SQL ile değil de
PySpark'ın içinde yazıyoruz?**

## Önce DataFrame nedir?

En yalın haliyle: **DataFrame, veriyi satır ve sütunlardan oluşan iki boyutlu bir tablo
yapısında tutan bir veri yapısıdır.** Excel'deki bir sayfa ya da veritabanındaki bir tablo gibi
düşünülebilir — her sütunun bir **adı** ve bir **veri tipi** vardır, her satır bir **kaydı**
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

Bir veritabanı tablosundan farkı şu: DataFrame kalıcı bir disk nesnesi değil, çoğu zaman
**programın belleğinde yaşayan** bir yapıdır. Ve asıl gücü buradan gelir — DataFrame,
yapılandırılmış veriyi **programatik olarak** manipüle etmenin en ergonomik yoludur. SQL'deki
sorgulama gücünü (filtrele, grupla, join'le, pivotla) alır, üstüne bir programlama dilinin
esnekliğini (değişken, döngü, koşul, fonksiyon) ekler. İki dünyanın kesişimidir.

En yaygın üç implementasyonu var:

- **pandas (Python):** En bilinen DataFrame. `pd.DataFrame()` ile oluşturulur; filtreleme,
  gruplama, join, pivot gibi işlemler SQL'e çok benzer şekilde yapılır. **Tek makinede, belleğin
  sınırları içinde** çalışır — veri RAM'e sığdığı sürece harikadır.
- **Spark DataFrame (PySpark):** pandas'ın **dağıtık** versiyonu gibi düşünülebilir. Veri
  cluster'daki node'lara dağıtılır, böylece **milyarlarca satır** işlenebilir. Bir lakehouse'daki
  bronz → gümüş → altın dönüşümlerini yürüten yapı tam olarak budur.
- **data.frame / tibble (R):** R'ın native veri yapısı; özellikle istatistiksel analizde çok
  yaygın.

## pandas DataFrame ile Spark DataFrame aynı şey mi?

Kavramsal olarak evet (ikisi de satır-sütun tablosu), ama çalışma modelleri bambaşka — ve bu
fark, ileride SQL vs PySpark tartışmasının da temeli.

| Kriter | pandas DataFrame | Spark DataFrame |
| --- | --- | --- |
| **Nerede çalışır** | Tek makine, tek process | Cluster — veri node'lara dağıtık |
| **Ölçek** | RAM'e sığan kadar (GB'lar) | Terabaytlar, milyarlarca satır |
| **Değerlendirme** | Eager — her satır anında çalışır | Lazy — plan biriktirilir, action'da çalışır |
| **Değiştirilebilirlik** | Mutable — yerinde değiştirilir | Immutable — her dönüşüm yeni DataFrame üretir |

En kritik satır sonuncudan bir önceki: **lazy evaluation.** pandas'ta bir filtre yazdığınız an
o filtre çalışır. Spark'ta ise `filter`, `join`, `groupBy` gibi dönüşümler hemen çalışmaz;
Spark bunları bir **plan** olarak biriktirir ve ancak `count`, `write`, `show` gibi bir
**action** geldiğinde tüm zinciri optimize edip bir kerede çalıştırır. Bu, dağıtık dünyada
verinin gereksiz yere node'lar arasında dolaşmasını engelleyen temel numaradır — birazdan
Catalyst optimizer'a gelince tekrar karşımıza çıkacak.

## Bunu neden salt SQL ile değil de PySpark ile yapıyoruz?

Buradaki ilk yanılgıyı baştan yıkmak lazım: **mesele SQL'in yetersiz olması değildir.** Aynı
dönüşümlerin çok büyük kısmını Spark SQL ile de yazabilirsiniz. Mesele, bazı senaryolarda
PySpark'ın daha uygun bir araç olmasıdır. SQL'in tek başına zorlandığı yerler şunlar:

- **Karmaşık kontrol akışı:** `if/else` dallanmaları, döngüler, `try/except` ile hata yönetimi,
  retry mantığı… SQL'de ya hiç yapılamaz ya da çok dolambaçlı olur.
- **Çok kaynaklı okuma/yazma:** SQL tek başına "Kafka'dan oku, Iceberg'e yaz" diyemez. Bunun
  için bir **execution engine** gerekir — veriyi nereden alıp nereye koyacağını yöneten bir
  katman.
- **Programatik müdahale gerektiren işler:** schema evolution, veri kalitesi kontrolleri,
  dinamik partition yönetimi gibi işlemler koşullu, programlanabilir bir mantık ister.
- **Ekosisteme erişim:** UDF yazmak, bir ML pipeline'ını entegre etmek, Python kütüphanelerine
  uzanmak gibi ihtiyaçlar programlama dili tarafını gerektirir.

PySpark'ın asıl farkı da burada: **PySpark sadece bir "sorgulama dili" değil, bir orkestrasyon
katmanıdır.** Veriyi nereden okuyacağınızı, nasıl dönüştüreceğinizi, nereye yazacağınızı ve hata
olursa ne yapacağınızı **tek bir programda** tanımlarsınız. SQL ise bu pipeline'ın içinde bir
**araç** olarak kullanılır.

Pratikte ikisi zaten birlikte gider. Tipik bir işte iskelet Python'da, dönüşüm SQL'de durur:

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

> Kısacası: **SQL "ne yapılacağını" söyler; PySpark "ne + nasıl + nereye + hata olursa ne
> olacak" sorularının hepsini bir arada yönetir.** SQL'in tek başına yapamadığı, pipeline'ı
> ayakta tutan iskelettir PySpark.

## Gerçek hayatta ne kadar SQL, ne kadar PySpark?

Bu oran projeye ve ekibe göre çok değişir, ama genel bir tablo çizilebilir. Tipik bir
lakehouse / ETL projesinde dönüşüm mantığının büyük kısmı — filtreleme, join, gruplama, window
function, `CASE WHEN` — **SQL ile** yazılır. PySpark DataFrame API'siyle yazılan kısım genelde
pipeline iskeleti, I/O ve edge-case yönetimidir. Kabaca **%60–70 SQL, %30–40 PySpark** demek
yanlış olmaz.

Peki bu oran nerede kayar?

| Ekip / bağlam | SQL | PySpark | Neden |
| --- | --- | --- | --- |
| **dbt kullanan ekipler** | ~%90+ | ~%10 | Tüm dönüşüm SQL'de; orkestrasyonu dbt + Airflow halleder |
| **Tipik lakehouse / ETL** | %60–70 | %30–40 | Dönüşüm SQL'de, iskelet ve I/O PySpark'ta |
| **ML / karmaşık veri müh.** | ~%50 | ~%50+ | Feature engineering, streaming, model serving Python ister |

Databricks/Spark ortamında çalışan çoğu veri mühendisinin pratiği aslında bu tablonun
özetidir: not defterinde `spark.sql("""...""")` yazarlar, etrafını Python ile sararlar. Yani
**SQL yazarlar, ama PySpark'ın içinde yazarlar.**

Bir lakehouse'un bronz → gümüş → altın dönüşümlerinde de tablo benzerdir: dönüşüm mantığının
çoğu Spark SQL ile yazılırken; Kafka'dan okuma, Iceberg'e yazma, schema kontrolü gibi kısımlar
PySpark ile yönetilir. Sonuç olarak sektörde **SQL hâlâ ağır basan taraftır.** PySpark'ın gücü
SQL'in yerine geçmesi değil, SQL'in tek başına yapamadığı kısmı tamamlamasıdır.

## Peki PySpark SQL ile klasik SQL'in farkı ne?

Şimdi işin en sık karıştırılan yerine geldik. İkisinde de **neredeyse birebir aynı SQL
sözdizimini** yazarsınız. Fark, sorgunun *nerede* ve *nasıl* çalıştığındadır.

**Klasik SQL (Oracle, PostgreSQL…).** Sorguyu veritabanı motoruna gönderirsiniz; motor, kendi
içindeki veriye kendi optimizer'ıyla çalışır. Veri tek bir sunucuda durur (Oracle RAC gibi
yapılarda sınırlı bir dağıtım olur). Bir kurumdaki klasik PL/SQL prosedürleri tam bu modeldir —
Oracle'ın kendi motoru çalıştırır.

```sql
-- Klasik SQL: motor = veritabanının kendisi, veri veritabanında
SELECT musteri_id, SUM(tutar)
FROM siparisler
GROUP BY musteri_id;
```

**PySpark SQL (`spark.sql()`).** Aynı SQL'i yazarsınız, ama onu çalıştıran motor **Spark**'tır.
Veri veritabanında değil; siz onu bir dosyadan/topic'ten okuyup geçici bir görünüme (view)
kaydeder, sonra üstünde SQL yazarsınız.

```python
# PySpark SQL: aynı SQL, ama motor = Spark, veri dağıtık
spark.read.parquet("s3://veri/siparisler").createOrReplaceTempView("siparisler")
spark.sql("SELECT musteri_id, SUM(tutar) FROM siparisler GROUP BY musteri_id")
```

Sözdizimi neredeyse aynı olsa da altında dört şey tamamen değişir:

- **Dağıtık çalışma.** Klasik motor sorguyu tek sunucuda koşturur. Spark sorguyu cluster'daki
  birden fazla node'a bölüp paralel işler. Oracle tek sunucuda 1 milyar satırı zorlanarak
  işlerken, Spark aynı işi 10 node'a dağıtıp çok daha hızlı bitirebilir.
- **Veri kaynağı esnekliği.** Oracle SQL yalnızca Oracle tablolarını sorgular. Spark SQL ile
  bir Kafka topic'ini, bir Iceberg tablosunu, bir Parquet dosyasını ve bir CSV'yi **aynı sorgu
  içinde join'leyebilirsiniz** — hepsi farklı yerlerde dursa bile.
- **Temp view mantığı.** Spark'ta kalıcı bir veritabanı şart değildir. Önce veriyi okuyup
  `createOrReplaceTempView("tablo")` dersiniz, sonra `spark.sql("SELECT * FROM tablo")`
  yazarsınız. Yani **bellekteki geçici tablolar** üzerinde SQL koşturursunuz.
- **Farklı optimizer.** Oracle'ın maliyet tabanlı optimizer'ı (CBO) vardır; Spark'ın
  **Catalyst** optimizer'ı vardır. İkisi aynı sorgu için farklı planlar çıkarır, farklı
  stratejiler uygular. (Yukarıda konuştuğumuz lazy evaluation'ın karşılığını Catalyst tam burada
  verir: tüm dönüşüm zincirini görüp tek bir optimize plana indirir.)

| Kriter | Klasik SQL (Oracle/PostgreSQL) | PySpark SQL (`spark.sql`) |
| --- | --- | --- |
| **Motor** | Veritabanının kendi motoru + CBO | Spark + Catalyst optimizer |
| **Veri nerede** | Veritabanında, tek sunucuda | Cluster'daki node'lara dağıtık |
| **Ölçekleme** | Dikey (daha güçlü sunucu) | Yatay (cluster'a node ekle) |
| **Veri kaynağı** | Sadece kendi tabloları | Kafka, Iceberg, Parquet, CSV… aynı sorguda |
| **Tablo** | Kalıcı şema nesnesi | `createOrReplaceTempView` ile bellekte geçici view |
| **Çalıştırma** | Genelde eager | Lazy — plan kurulur, action'da çalışır |

> Özetle: yazdığınız SQL neredeyse aynıdır; ama **altındaki motor, verinin durduğu yer ve
> ölçeklenme modeli tamamen farklıdır.** Klasik SQL veriyi kendi evinde sorgular; Spark SQL
> veriyi nereden gelirse gelsin toplayıp dağıtık bir orduyla işler.

## Özet: bir yapı, iki SQL, bir orkestratör

Üç parçayı birbirine bağlayalım. **DataFrame**, yapılandırılmış veriyi programatik olarak
tutmanın ergonomik yolu — pandas'ta tek makinede, Spark'ta cluster'a dağıtık. Bu dağıtık yapıyla
konuşmanın **iki yolu** var: DataFrame API (`df.groupBy(...).agg(...)`) ve SQL
(`spark.sql("...")`) — ikisi de aynı Catalyst motoruna iner, çoğu zaman zevk meselesidir.

**SQL vs PySpark SQL** ayrımı ise sözdiziminde değil, motordadır: aynı SELECT, ama biri
veritabanının tek sunucusunda, diğeri Spark'ın dağıtık cluster'ında koşar. Ve **salt SQL vs
PySpark** tartışmasında da kazanan aslında yoktur — çünkü ikisi rakip değil, katmandır: SQL
dönüşümün "ne"sini yazar, PySpark ise okuma, yazma, hata yönetimi ve akış kontrolüyle
pipeline'ın iskeletini tutar. Sektörün "%60–70 SQL, gerisi PySpark" pratiği de tam bunu söyler:
**SQL hâlâ kraldır, PySpark ise onu tek başına yapamadığı işe taşıyan araçtır.**
