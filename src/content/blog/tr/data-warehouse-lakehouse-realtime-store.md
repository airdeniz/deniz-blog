---
title: 'Hangi Veri Nereye: Data Warehouse, Lakehouse ve Gerçek Zamanlı Analitik Store'
description: 'Analitik verinin üç klasik adresi vardır: temiz ve modellenmiş Data Warehouse, ham dosyayla açık tabloyu aynı çatıda tutan Lakehouse, ve olay akışını saniye altında sorgulatan gerçek zamanlı analitik store (ClickHouse, Druid, Pinot, Azure Data Explorer). Bu yazı "hangi veri nereye?" sorusunu üçünün kimliği, karar sinyalleri, sınavların ve mimarların sevdiği tuzaklar ve gerçek dünyada üçünün bir arada nasıl aktığı üzerinden cevaplıyor.'
pubDate: 2026-07-28
tags: ['Data Warehouse', 'Lakehouse', 'Gerçek Zamanlı Analitik', 'OLAP', 'Veri Mimarisi', 'Big Data']
draft: false
---

Önünde üç soru olsun:

1. "Geçen çeyrekte bölgelere göre ciro ne oldu?"
2. "Son iki yılın ham tıklama kayıtları üzerinde bir churn (müşteri kaybı) modeli eğit."
3. "Son 30 saniyede kaç kullanıcı 'ödeme' butonuna bastı?"

Üçü de aynı işe benziyor: veriyi bir yere koy, sonra sorgula. İlk refleks de
hepsine "bir veritabanına atarız" demek. Oysa bu üç sorunun doğru cevabı **üç
ayrı depo tipidir** — ve yanlış depoyu seçmenin bedeli ya dize gelen bir sistem
ya da boşa harcanan bir bütçedir.

Sektör bu üç depoyu çoğunlukla şu adlarla anar: **Data Warehouse** (veri
ambarı), **Data Lakehouse** ve **gerçek zamanlı analitik store** (real-time /
streaming analytics database). Microsoft Fabric bunları sırasıyla Warehouse,
Lakehouse ve Eventhouse olarak paketler; aynı üçlüyü Databricks + Snowflake +
ClickHouse ile de, tamamen açık kaynak araçlarla da kurabilirsin. İsimler
platformdan platforma değişir; **rol dağılımı değişmez.**

Bu yazı önce üçlünün haritadaki yerini belirliyor (ipucu: üçü de **OLTP
değil**), sonra her birinin kimliğini kuruyor, ardından "hangi veri nereye"
kararını veren sinyal kelimeleri sıralıyor — ve en sonda, gerçek dünyada bu
üçünün **tek tek değil, bir arada** çalıştığını somut bir akışla gösteriyor.

## Önce sınır: bunların hiçbiri senin uygulama veritabanın değil

Karışıklığı baştan önlemek için bir çizgi çekelim. Uygulamanın canlıda
kullandığı veritabanı — siparişi yazan, sepeti güncelleyen PostgreSQL/MySQL/
MongoDB — **OLTP** (Online Transaction Processing) dünyasına aittir: tek kaydı
satır satır, hızla yazıp okur; tutarlılık her şeyin önündedir.

Bu yazının üç kahramanı ise **OLAP** (Online Analytical Processing) tarafında
durur: milyonlarca, milyarlarca satırı **toplu** tarayıp özet çıkarmak,
gruplayıp saymak, trend yakalamak için tasarlanmışlardır. Soru artık "şu tek
siparişi getir" değil, "şu 400 milyon siparişi bölgeye göre topla"dır.
Warehouse, Lakehouse ve gerçek zamanlı store, bu analitik sorunun farklı
tiplerine verilmiş üç ayrı cevaptır. Onları birbirinden ayıran da tam olarak
**verinin şekli** ile **erişim biçimidir.**

## 1. Data Warehouse — temiz, modellenmiş, güvenilir kat

Data warehouse üçlünün en eskisi ve en olgunudur. Kimliği tek cümleyle:
**temizlenmiş, yapılandırılmış, ilişkisel veriyi iş raporlamasına servis eden
SQL dünyası.**

Veri buraya ham hâliyle değil, **modellenmiş** hâliyle girer. Klasik yöntem
*dimensional modeling*: ortada bir olgu tablosu (fact — ör. `satislar`),
çevresinde boyut tabloları (dimension — `musteri`, `urun`, `zaman`, `magaza`).
Analist bu tabloları saf T-SQL ile `JOIN`'ler, `GROUP BY` ile toplar, rapora
döker. Veri disipline edilmiştir: kolonlar tanımlı, tipler net; "tek doğru"
burada durur.

- **Kimin aracı:** SQL bilen veri analisti / klasik DWH'cı, BI ekibi.
- **Veri tipi:** yalnızca yapılandırılmış, ilişkisel.
- **Dil:** T-SQL — üstelik tam yetkiyle (`INSERT/UPDATE/DELETE`, stored
  procedure).
- **Tipik yük:** çeyrek raporları, dashboard'ları besleyen özet tablolar, çok
  tablolu birleştirmeler.
- **Gecikme:** batch. Veri gece işlenir, sabah rapordadır.
- **Sektörden örnekler:** Snowflake, Google BigQuery, Amazon Redshift, Azure
  Synapse / Fabric Warehouse ve klasik Oracle/Teradata ambarları.

Oracle DWH refleksin varsa bu kat ona birebir oturur: ODI + PL/SQL ile
beslenen, yıldız şemalı, "raporun tek kaynağı" olan kat.

## 2. Data Lakehouse — data lake'in özgürlüğü, warehouse'un disiplini

Lakehouse'u anlamanın yolu, önce **neden doğduğunu** anlamaktan geçer; çünkü o
bir uzlaşmadır.

2010'larda iki ayrı dünya vardı. Bir yanda **data warehouse**: güvenilir,
tutarlı, ama pahalı ve katı; yalnızca yapılandırılmış veri kabul eder — ham log
dosyasını, videoyu, düzensiz JSON'u içine sokamazsın. Öte yanda **data lake**:
S3/HDFS üzerinde her şeyi (Parquet, JSON, görüntü, ne varsa) ucuza biriktiren
dev bir dosya deposu — ama şemasız, ACID garantisinden yoksun ve kolayca "veri
bataklığına" (data swamp) dönüşen bir yer. Ekipler ya birinin katılığında ya
öbürünün düzensizliğinde boğuluyordu.

**Lakehouse, tam olarak bu ikisini birleştirme fikridir:** ucuz nesne
depolamanın (data lake) üstüne warehouse disiplinini — ACID transaction'lar,
şema zorlaması, tablo semantiği — getirmek. Bunu mümkün kılan asıl mekanizma
**açık tablo formatlarıdır:** Delta Lake, Apache Iceberg, Apache Hudi. Bu
formatlar Parquet dosyalarının üstüne bir metadata/işlem günlüğü katmanı serer;
böylece sıradan bir dosya yığını güvenilir, transaction'lı, zamanda geri
gidilebilen bir **tabloya** dönüşür — veri ise hâlâ açık formatta, ucuz
depoda, herkesin erişimine açık durur.

- **Kimin aracı:** veri mühendisi, data scientist (Spark/Python bilen).
- **Veri tipi:** hepsi — yapılandırılmış tablo da, yarı yapılandırılmış JSON
  da, ham dosya da.
- **Dil:** Spark (PySpark, Spark SQL); okuma tarafında çoğu platform ayrıca
  salt-okunur bir SQL uç noktası sunar.
- **Tipik yük:** *medallion* mimarisi (bronze ham → silver temiz → gold servise
  hazır), büyük dosya işleme, ML için özellik hazırlama.
- **Gecikme:** batch / micro-batch.
- **Sektörden örnekler:** Databricks (Delta Lake), S3/ADLS üzerinde Apache
  Iceberg, Fabric Lakehouse.

Kilit sezgi şu: lakehouse warehouse'un **yerine geçmez**; ham veriyle
güvenilir tablo arasındaki **köprüdür**. Ham veri buraya düşer, burada
temizlenip modellenir ve "gold" katmanı çoğu zaman warehouse'a ya da doğrudan
BI'a servis edilir.

## 3. Gerçek zamanlı analitik store — akan olayı saniye altında sorgula

Üçüncüsü, sektörde tek bir standart isme oturmamış bir kategori: kabaca
**gerçek zamanlı / akış analitiği veritabanı** (real-time analytics database,
streaming analytics store, kimi yerde "olay/zaman-serisi analitik motoru")
denir. Fabric bunu **Eventhouse** (altında Azure Data Explorer / Kusto motoru)
olarak paketler; bağımsız dünyadaki karşılıkları **ClickHouse, Apache Druid,
Apache Pinot** ve bunlara yakın konumdaki **Elasticsearch**'tür.

Bu deponun tek bir amacı var: **sürekli akan olay verisini, üretilmesinin
üzerinden saniyeler geçmişken, milisaniyeler içinde sorgulatmak.** Warehouse'a
veri gece girer; buraya veri **şimdi** girer ve **şimdi** sorgulanır.

- **Kimin aracı:** gerçek zamanlı/operasyonel analitik yapan ekip,
  gözlemlenebilirlik (observability) ekibi.
- **Veri tipi:** zaman serisi, olay (event), telemetri, log, clickstream — hep
  bir zaman damgasıyla akan, yüksek hacimli, yüksek kardinaliteli veri.
- **Dil:** motora özgü sorgu dilleri (Kusto/KQL, ClickHouse SQL, Druid SQL) +
  streaming ingestion.
- **Tipik yük:** canlı dashboard ("son 5 dakikada hata oranı"), anomali
  tespiti, IoT sensör akışı, "şu an kaç kişi online".
- **Gecikme:** **saniye altı**, near-real-time. Hem veri girişi hem sorgu
  tazedir.
- **Sektörden örnekler:** ClickHouse, Apache Druid, Apache Pinot, Azure Data
  Explorer (Fabric Eventhouse), (arama tarafında) Elasticsearch.

Neden ayrı bir motor gerekiyor? Çünkü bu tür sorgular — "milyarlarca satır
içinde son 1 dakikayı zaman kolonuna göre süz ve grupla" — kolon-tabanlı
depolama, agresif indeksleme ve akış hızında ingest üzerine özel olarak
tasarlanmış bir motor ister. Aynı işi bir warehouse'a yaptırmaya kalkarsan ya
gecikme dakikalara çıkar ya da maliyet katlanır.

## Karar tablosu: "hangi veri nereye?"

|  | **Data Warehouse** | **Lakehouse** | **Gerçek Zamanlı Store** |
| --- | --- | --- | --- |
| **Ana kullanıcı** | SQL analisti / BI | Veri mühendisi, data scientist | Real-time / observability ekibi |
| **Veri tipi** | Yapılandırılmış, ilişkisel | Yapılandırılmış + yarı/ham (dosyalar) | Zaman serisi, olay, log, telemetri |
| **Yazma/işleme dili** | T-SQL (tam yetki) | Spark (PySpark, Spark SQL) | KQL / motor SQL + streaming ingest |
| **Tipik yük** | Dimensional model, iş raporu | Medallion, ML hazırlığı, büyük dosya | Canlı dashboard, IoT, anomali |
| **Gecikme** | Batch | Batch / micro-batch | Saniye altı |
| **Depolama** | Kapalı, motora özel (çoğunlukla) | Açık format (Delta/Iceberg), ucuz göl | Kolon-tabanlı, akış için optimize |
| **En yakın refleks** | Oracle/Teradata DWH | Spark + Iceberg/Delta katmanı | ClickHouse/Elasticsearch hissi |

## Sorudaki sinyal kelimeler → doğru depo

Bir senaryo sorusunda — ya da gerçek bir mimari kararında — şu kelimeler
genellikle şu depoyu işaret eder:

- **"dimensional model", "stored procedure", "T-SQL ile UPDATE/DELETE", "SQL
  analistleri Spark bilmiyor", "çok tablolu iş raporu", "tek doğru kaynağı"**
  → **Data Warehouse**
- **"ham/yarı yapılandırılmış dosyalar", "CSV/JSON/Parquet", "PySpark",
  "ML/feature hazırlığı", "medallion / bronze-silver-gold", "ucuz açık depoda
  tut"** → **Lakehouse**
- **"telemetri", "IoT", "log", "clickstream", "zaman serisi",
  "milisaniye/saniye gecikme", "streaming ingestion", "canlı dashboard", "son
  N saniye/dakika"** → **Gerçek Zamanlı Store**

## Üç klasik tuzak

Bu üçlü, hem sertifika sınavlarının hem gerçek mimari toplantılarının en
sevdiği tuzak alanıdır. Üç tuzak şöyle:

**1. "SQL kullanacaklar" tek başına warehouse demek değildir.** Lakehouse'un da
bir SQL uç noktası vardır; birçok gerçek zamanlı store da bir SQL lehçesi
konuşur. Ayırt edici soru "SQL var mı" değil, **"veriyi yazıp değiştirecekler
mi, yalnızca okuyacaklar mı"** ve **"verinin şekli ne"**. Yalnızca `SELECT`
çekilecek yapılandırılmış veri için lakehouse'un uç noktası yeterlidir; veri
T-SQL ile güncellenecekse warehouse şarttır.

**2. Karma senaryolar tek depoyla çözülmez — ama gereksiz katman da eklenmez.**
"Ham dosyalar geliyor + üstüne temiz SQL raporu isteniyor" tipi sorularda doğru
cevap çoğu zaman **ikili mimaridir**: Lakehouse (ham + işleme) → Warehouse
(servis/rapor). Tuzağın ters yönü de var: tek deponun yettiği yere "önce şuraya
kopyalayalım, sonra buraya taşıyalım" diye **gereksiz ara depo** eklemek de
yanlıştır. Doğru cevap ne eksik katmandır ne fazla katman.

**3. Modern platformlarda "veriyi kopyala" çoğu zaman yanlış şıktır.** Bugünün
ekosisteminde depolar açık formatta (Delta/Iceberg/Parquet) ve ortak bir
depolama katmanında durabildiği için, bir motor diğerinin verisini
**kopyalamadan** okuyabilir — Fabric'te "shortcut" ve OneLake, açık dünyada
farklı motorların aynı Iceberg tablosunu okuması bunun örnekleridir. "Önce
kopyala" diyen tasarım çoğu zaman hem paradan hem tazelikten kaybettirir.

## Gerçek dünya: üçünden birini seçmezsin, üçünü akıtırsın

SQL vs NoSQL tartışmasında olduğu gibi, buradaki asıl ders de "hangisi kazanır"
değil. Ciddi bir veri platformunda bu üçü **aynı anda** yaşar ve veri
aralarında akar. Büyük bir e-ticaret ya da IoT platformunu düşün:

<pre style="width:max-content;max-width:100%;margin-inline:auto">
   İŞLEMSEL KAYNAKLAR (OLTP)            OLAY / TELEMETRİ (akış)
   PostgreSQL, uygulama DB'leri         Kafka, IoT, log, clickstream
             |                                     |
             |  batch / CDC                        |  streaming ingest
             v                                     v
   +----------------------+            +--------------------------+
   |      LAKEHOUSE       |            |  GERÇEK ZAMANLI STORE    |
   |  ham + işlenmiş      |            |  ClickHouse / Druid /    |
   |  açık tablolar       |            |  Pinot / ADX             |
   |  (Delta / Iceberg)   |            |  olaya saniye-altı sorgu |
   |  Spark + ML          |            +--------------------------+
   +----------------------+                        |
             |                                     v
             |  "gold" (temiz, modellenmiş)  +--------------------------+
             v                               |    CANLI DASHBOARD       |
   +----------------------+                  |    "son 30 saniye"       |
   |     WAREHOUSE        |                  +--------------------------+
   |  modellenmiş, güvenilir |
   |  T-SQL, BI'a servis  |
   +----------------------+
             |
             v
      BI / raporlar (Power BI, Tableau)
</pre>

Akış şöyle işler:

1. **İşlemsel veri** (siparişler, kullanıcılar) OLTP'den batch ya da CDC ile
   **Lakehouse**'a düşer; ham hâliyle bronze'a girer, silver'da temizlenir.
2. Paralelde **olay/telemetri akışı** (tıklamalar, sensörler, loglar) doğrudan
   **gerçek zamanlı store**'a ingest edilir; oradaki canlı dashboard "şu an ne
   oluyor" sorusunu saniye altında cevaplar.
3. Lakehouse'ta **gold** katmanı modellenir ve **Warehouse**'a servis edilir;
   analistler çeyrek raporlarını ve KPI'ları oradan çeker.
4. Çoğu zaman gerçek zamanlı store da geçmişi arşivlemek için verisini
   periyodik olarak lakehouse'a boşaltır; böylece "canlı" ile "tarihsel"
   analiz aynı gölde buluşur.

Her depo kendi güçlü olduğu işi yaparken diğerlerinden kopmaz: taze olay gerçek
zamanlı store'da, ham ve işlenmiş her şey lakehouse'ta, tek-doğru iş raporu
warehouse'ta durur — ve veri aralarında tek yönlü değil, ihtiyaca göre akar.

## Özet: depo tipi de bir eksen

`ALTER TABLE`'ın "esneklik iki ayrı şeydir" dersi gibi, burada da tek bir eksen
var. Bir uçta **taze ama ham** veri durur (akan olaylar, ham dosyalar), diğer
uçta **yavaş ama parlatılmış** veri (modellenmiş, güvenilir iş raporu). Gerçek
zamanlı store en taze uçtadır; warehouse en rafine uçta; lakehouse tam ortada
— ham veriyi alıp rafine uca taşıyan köprü.

Dolayısıyla doğru soru "hangi depo daha iyi" değildir; hiçbiri diğerinin işini
iyi yapmaz. Doğru soru, elindeki verinin **şeklinin** ve ona soracağın sorunun
**tazeliğinin** bu eksende nereye düştüğüdür. Fabric bu üçlüyü
Warehouse/Lakehouse/Eventhouse diye paketler, Databricks + Snowflake +
ClickHouse başka türlü paketler; ama karar hep aynıdır: **taze olay gerçek
zamanlı store'a, ham ve işlenmiş lakehouse'a, tek-doğru rapor warehouse'a.**
Modern bir veri mimarisinde tek bir kahraman yoktur; üç ayrı depo tipi vardır
ve veri sürekli aralarında akar.
