---
title: 'Aynı Veri Üç Ayrı Eve Nasıl Yerleşir: Data Warehouse, Lakehouse ve Gerçek Zamanlı Analitik Store'
description: 'Analitik veriyi saklamanın üç klasik yolu vardır: temiz ve modellenmiş Data Warehouse, ham dosyayı da açık tabloyu da tutan Lakehouse, ve olay/telemetri akışını saniye altında sorgulatan gerçek zamanlı analitik store (ClickHouse, Druid, Pinot, Azure Data Explorer). "Hangi veri nereye?" sorusunu; her birinin kimliğini, sinyal kelimelerini, sınavların ve mimarların sevdiği tuzakları ve gerçek dünyada üçünün nasıl bir arada aktığını anlatan bir yazı. Fabric sadece bir örnek.'
pubDate: 2026-07-28
tags: ['Data Warehouse', 'Lakehouse', 'Gerçek Zamanlı Analitik', 'OLAP', 'Veri Mimarisi', 'Big Data']
draft: false
---

Elinde üç soru olsun:

1. "Geçen çeyrekte bölgelere göre ciro ne oldu?"
2. "Son iki yılın ham tıklama kayıtları üzerinde bir churn (müşteri kaybı) modeli eğit."
3. "Son 30 saniyede kaç kullanıcı 'ödeme' butonuna bastı?"

Üçü de "veriyi bir yere koy, sonra sorgula" işine benziyor. İçgüdü hepsine "bir veritabanına atarız" demek ister. Ama bu üç sorunun doğru cevabı **üç ayrı depo tipidir** — ve yanlış depoyu seçmek, ya sistemi dize getirir ya da parayı çöpe atar.

Bu üç depo, sektörde çoğu zaman şu adlarla anılır: **Data Warehouse** (veri ambarı), **Data Lakehouse** ve **gerçek zamanlı analitik store** (real-time / streaming analytics database). Microsoft Fabric'te bunlar sırasıyla Warehouse, Lakehouse ve Eventhouse olarak paketlenir; ama aynı üçlüyü Databricks + Snowflake + ClickHouse ile de, tamamen açık kaynak araçlarla da kurabilirsin. İsimler platforma göre değişir, **rol dağılımı değişmez.**

Bu yazı önce bu üçlünün nereye oturduğunu (ipucu: üçü de **OLTP değil**), sonra her birinin kimliğini, ardından "hangi veri nereye" kararının sinyal kelimelerini kuruyor — en sonunda da gerçek dünyada bunların **tek tek değil, bir arada** çalıştığını somut bir akışla gösteriyor.

## Önce sınır: bunların hiçbiri senin uygulama veritabanın değil

Kafayı karıştırmamak için baştan bir çizgi çekelim. Uygulamanın canlı çalışırken kullandığı veritabanı — sipariş yazan, sepeti güncelleyen PostgreSQL/MySQL/MongoDB — **OLTP** (Online Transaction Processing) dünyasındadır: satır satır, tek kaydı hızlıca yaz-oku, tutarlılık her şeyden önce gelir.

Bu yazının üç kahramanı ise **OLAP** (Online Analytical Processing) tarafındadır: milyonlarca/milyarlarca satırı **toplu** tarayıp özet çıkarmak, gruplayıp saymak, trend bulmak için tasarlanmışlardır. Yani soru "şu tek siparişi getir" değil, "şu 400 milyon siparişi bölgeye göre topla"dır. Warehouse, Lakehouse ve gerçek zamanlı store; hepsi bu analitik sorunun farklı lezzetlerine verilmiş cevaplardır. Üçünü birbirinden ayıran şey de zaten **verinin şekli** ile **erişim biçimidir.**

## 1. Data Warehouse — temiz, modellenmiş, güvenilir kat

Data warehouse en eski ve en olgun olanı. Kimliği tek cümleyle: **temizlenmiş, yapılandırılmış, ilişkisel veriyi iş raporlamasına servis eden SQL dünyası.**

Buraya veri, ham hâliyle değil, **modellenmiş** hâliyle girer. Klasik yöntem *dimensional modeling*'dir: ortada bir olgu tablosu (fact — ör. `satislar`), etrafında boyut tabloları (dimension — `musteri`, `urun`, `zaman`, `magaza`). Analist saf T-SQL ile bu tabloları `JOIN`'ler, `GROUP BY` ile toplar, rapora döker. Veri disipline edilmiştir; kolonlar bellidir, tipler nettir, "tek doğru" burada durur.

- **Kimin aracı:** SQL bilen veri analisti / klasik DWH'cı, BI ekibi.
- **Veri tipi:** yalnızca yapılandırılmış, ilişkisel.
- **Dil:** T-SQL — üstelik tam yetkiyle (`INSERT/UPDATE/DELETE`, stored procedure).
- **Tipik yük:** çeyrek raporları, dashboard'lara beslenen özet tablolar, çok tablolu birleştirmeler.
- **Gecikme:** batch. Veri gece işlenir, sabah rapordadır.
- **Sektörden örnekler:** Snowflake, Google BigQuery, Amazon Redshift, Azure Synapse / Fabric Warehouse, ve klasik Oracle/Teradata ambarları.

Bir Oracle DWH refleksin varsa, bu öğe ona birebir oturur: ODI + PL/SQL ile beslenen, yıldız şemalı, "raporun tek kaynağı" olan kat.

## 2. Data Lakehouse — data lake'in özgürlüğü, warehouse'un disiplini

Lakehouse'u anlamak için önce onun **neden doğduğunu** anlamak gerekiyor, çünkü o bir uzlaşmadır.

2010'larda iki ayrı dünya vardı. Bir yanda **data warehouse**: güvenilir, tutarlı, ama pahalı, katı ve sadece yapılandırılmış veri alır — ham log dosyasını, videoyu, düzensiz JSON'u içine sokamazsın. Öbür yanda **data lake**: S3/HDFS üzerinde ucuza her şeyi (Parquet, JSON, görüntü, ne olursa) biriktiren dev bir dosya deposu — ama şemasız, ACID garantisi yok, kolayca "veri bataklığına" (data swamp) dönüşen bir yer. Ekipler ya birinde ya öbüründe boğuluyordu.

**Lakehouse tam da bu ikisini birleştirme fikridir:** ucuz nesne depolamanın (data lake) üstüne, warehouse'un getirdiği disiplini — ACID transaction'lar, şema zorlaması, tablo semantiği — getirmek. Bunu mümkün kılan sihir **açık tablo formatlarıdır:** Delta Lake, Apache Iceberg, Apache Hudi. Bunlar Parquet dosyalarının üstüne bir metadata/işlem günlüğü katmanı serer; böylece "sıradan dosya yığını" birdenbire güvenilir, transaction'lı, zaman-yolculuğu yapılabilen bir **tabloya** dönüşür — ama veri hâlâ açık formatta, ucuz depoda, herkese açık durur.

- **Kimin aracı:** veri mühendisi, data scientist (Spark/Python bilen).
- **Veri tipi:** hepsi — yapılandırılmış tablo da, yarı yapılandırılmış JSON da, ham dosya (Files!) da.
- **Dil:** Spark (PySpark, Spark SQL); okumada çoğu platform bir salt-okunur SQL uç noktası da sunar.
- **Tipik yük:** *medallion* mimarisi (bronze ham → silver temiz → gold servise hazır), büyük dosya işleme, ML için özellik hazırlama.
- **Gecikme:** batch / micro-batch.
- **Sektörden örnekler:** Databricks (Delta Lake), S3/ADLS üzerinde Apache Iceberg, Fabric Lakehouse.

Kilit sezgi: lakehouse "warehouse'un yerine geçen" bir şey değil, ham veriyle güvenilir tablo arasındaki **köprü**. Ham veri buraya düşer, burada temizlenip modellenir, ve çoğu zaman "gold" katmanı warehouse'a ya da BI'a servis edilir.

## 3. Gerçek zamanlı analitik store — akan olayı saniye altında sorgula

Üçüncüsü, sektörde tek bir standart isme oturmayan ama kabaca **gerçek zamanlı / akış analitiği veritabanı** (real-time analytics database, streaming analytics store, kimi yerde "olay/zaman-serisi analitik motoru") denen kategoridir. Fabric bunu **Eventhouse** (altında Azure Data Explorer / Kusto motoru) olarak paketler; ama bağımsız dünyada karşılıkları **ClickHouse, Apache Druid, Apache Pinot** ve komşusu **Elasticsearch**'tür.

Bu deponun derdi tek şey: **sürekli akan olay verisini, o veri daha saniyeler önce üretilmişken, milisaniyeler içinde sorgulatmak.** Warehouse'a veri gece girer; buraya veri **şimdi** girer ve **şimdi** sorgulanır.

- **Kimin aracı:** gerçek zamanlı/operasyonel analitik yapan ekip, gözlemlenebilirlik (observability) ekibi.
- **Veri tipi:** zaman serisi, olay (event), telemetri, log, clickstream — hep bir zaman damgasıyla akan, yüksek hacimli, yüksek kardinaliteli veri.
- **Dil:** motora özgü sorgu dilleri (Kusto/KQL, ClickHouse SQL, Druid SQL) + streaming ingestion.
- **Tipik yük:** canlı dashboard ("son 5 dakikada hata oranı"), anomali tespiti, IoT sensör akışı, "şu an kaç kişi online".
- **Gecikme:** **saniye altı**, near-real-time. Hem veri girişi hem sorgu tazedir.
- **Sektörden örnekler:** ClickHouse, Apache Druid, Apache Pinot, Azure Data Explorer (Fabric Eventhouse), (arama tarafında) Elasticsearch.

Neden ayrı bir motor gerekiyor? Çünkü bu tür sorgular — "milyarlarca satır arasında, son 1 dakikayı zaman kolonuna göre süz ve grupla" — kolon-tabanlı depolama, agresif indeksleme ve akış-anında ingest üzerine özel olarak tasarlanmış bir motor ister. Aynı işi bir warehouse'a yaptırmaya kalkarsan ya gecikme dakikalara çıkar ya maliyet patlar.

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

Bir senaryo sorusunda (ya da gerçek bir mimari kararında) şu kelimeler genelde şu depoyu işaret eder:

- **"dimensional model", "stored procedure", "T-SQL ile UPDATE/DELETE", "SQL analistleri Spark bilmiyor", "çok tablolu iş raporu", "tek doğru kaynağı"** → **Data Warehouse**
- **"ham/yarı yapılandırılmış dosyalar", "CSV/JSON/Parquet", "PySpark", "ML/feature hazırlığı", "medallion / bronze-silver-gold", "ucuz açık depoda tut"** → **Lakehouse**
- **"telemetri", "IoT", "log", "clickstream", "zaman serisi", "milisaniye/saniye gecikme", "streaming ingestion", "canlı dashboard", "son N saniye/dakika"** → **Gerçek Zamanlı Store**

## Üç klasik tuzak

Bu üçlü hem sertifika sınavlarının hem gerçek mimari toplantılarının en sevdiği tuzak alanıdır. Üçü şunlar:

**1. "SQL kullanacaklar" tek başına warehouse demek değildir.** Lakehouse'un da bir SQL uç noktası vardır; birçok gerçek zamanlı store da SQL lehçesi konuşur. Ayırt edici soru "SQL var mı" değil, **"veriyi yazıp değiştirecekler mi, yalnızca okuyacaklar mı"** ve **"verinin şekli ne"**. Sadece `SELECT` çekilecek yapılandırılmış veri için lakehouse'un uç noktası yeter; T-SQL ile veri güncellenecekse warehouse şarttır.

**2. Karma senaryolar tek depoyla çözülmez — ama gereksiz katman da eklemez.** "Ham dosyalar geliyor + üstüne temiz SQL raporu isteniyor" tipi sorularda doğru cevap çoğu zaman **ikili mimaridir**: Lakehouse (ham + işleme) → Warehouse (servis/rapor). Ters yönde tuzak da var: tek deponun yettiği yere "önce şuraya kopyalayalım, sonra buraya taşıyalım" diye **gereksiz ara depo** eklemek de yanlıştır. Doğru cevap ne eksik katman ne fazla katmandır.

**3. Modern platformlarda "veriyi kopyalamak" çoğu zaman yanlış şıktır.** Bugünün ekosisteminde depolar açık formatta (Delta/Iceberg/Parquet) ve ortak bir depolama katmanında durabildiği için, bir motorun diğerinin verisini **kopyalamadan** okuması mümkündür — Fabric'te "shortcut" ve OneLake, açık dünyada Iceberg üzerinden farklı motorların aynı tabloyu okuması bunun örneğidir. "Önce kopyala" diyen tasarım çoğu zaman hem para hem tazelik kaybettirir.

## Gerçek dünya: üçünden birini seçmezsin, üçünü akıtırsın

SQL vs NoSQL tartışmasında olduğu gibi, buradaki asıl ders de "hangisi kazanır" değil. Ciddi bir veri platformunda bu üçü **aynı anda** yaşar ve veri aralarında akar. Dev bir e-ticaret veya IoT platformunu düşün:

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

1. **İşlemsel veri** (siparişler, kullanıcılar) OLTP'den batch ya da CDC ile **Lakehouse**'a düşer; ham hâliyle bronze'a girer, silver'da temizlenir.
2. Paralelde **olay/telemetri akışı** (tıklamalar, sensörler, loglar) doğrudan **gerçek zamanlı store**'a ingest edilir; oradaki canlı dashboard "şu an ne oluyor"u saniye altında gösterir.
3. Lakehouse'ta **gold** katmanı modellenir ve **Warehouse**'a servis edilir; analistler oradan çeyrek raporlarını, KPI'ları çeker.
4. Çoğu zaman gerçek zamanlı store da geçmiş veriyi arşivlemek için verisini periyodik olarak lakehouse'a boşaltır; böylece "canlı" ile "tarihsel" analiz aynı gölde buluşur.

Her depo, kendi güçlü olduğu işi yaparken diğerlerinden kopmaz: taze olay gerçek zamanlı store'da, ham ve işlenmiş her şey lakehouse'ta, tek-doğru iş raporu warehouse'ta durur — ve veri aralarında tek yönlü değil, ihtiyaca göre akar.

## Özet: depo tipi de bir eksen

`ALTER TABLE`'ın "esneklik iki ayrı şeydir" dersi gibi, burada da tek bir eksen var. Bir uçta **taze ama ham** (akan olaylar, ham dosyalar), diğer uçta **yavaş ama parlatılmış** (modellenmiş, güvenilir iş raporu) veri durur. Gerçek zamanlı store en taze uçtadır; warehouse en rafine uçta; lakehouse tam ortada, ham veriyi alıp rafine uca doğru taşıyan köprüdür.

Dolayısıyla doğru soru "hangi depo daha iyi" değildir — hiçbiri diğerinin işini iyi yapmaz. Doğru soru, elindeki verinin **şeklinin** ve ona soracağın sorunun **tazeliğinin** bu eksende nereye düştüğüdür. Fabric bu üçlüyü Warehouse/Lakehouse/Eventhouse diye paketler, Databricks + Snowflake + ClickHouse başka türlü paketler; ama karar hep aynı kalır: **taze olayı gerçek zamanlı store'a, ham ve işlenmişi lakehouse'a, tek-doğru raporu warehouse'a.** Modern bir veri mimarisinde tek bir kahraman yoktur; üç ev vardır ve veri hepsinin arasında akar.
