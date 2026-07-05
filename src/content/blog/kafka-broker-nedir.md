---
title: 'Oracle''dan Gelen Biri İçin Kafka''da Broker Nedir?'
description: 'Kafka serisinin dördüncü yazısı: broker gerçekte ne iş yapar? Topic bir tablo mudur, controller seçmek zorunlu mu, Raft konsensüs nasıl çalışır, 5 broker = 5 instance ne demek, lokaldeki portlar prod''da nasıl gerçek sunuculara dönüşür? Oracle client-server dünyasından gelen biri için Kafka broker''ını baştan kuruyorum.'
pubDate: 2026-07-05
tags: ['Kafka', 'Broker', 'KRaft', 'Raft', 'Dağıtık Sistemler', 'Backend']
draft: false
---

Bu yazı, Kafka serisinin dördüncü parçası. İlk üç yazıda bir cluster'ın nasıl
kurulduğunu ([1. yazı](/blog/kafka-cluster-mimarisi/)), bir mesajın hangi partition'a
düşüp offset'le nasıl sıralandığını ([2. yazı](/blog/kafka-partition-offset-siralama/))
ve bu kararı veren partitioner'ları ([3. yazı](/blog/kafka-partitioner-cesitleri/))
konuşmuştuk. Bu üçünde de broker sürekli sahnedeydi ama hep başka kavramların
(partition, leader, KRaft) içinden geçerek. Bu yazıda kamerayı doğrudan **broker'ın**
üzerine çeviriyorum.

Bunu yaparken de kendi geldiğim yeri kullanacağım: ben **Oracle ekosisteminden**
geliyorum, yani kafamda yıllardır oturmuş bir **client-server** mantığı var. Kafka'ya
ilk baktığımda en çok ters köşe olduğum şey de buydu. O yüzden broker'ı sıfırdan,
Oracle refleksleriyle kıyaslayarak kuracağım.

## Broker nedir?

En yalın haliyle: **broker, çalışan tek bir Kafka sürecidir (instance).** Kafka
genelde tek başına değil, yan yana gelmiş birden fazla sürecin oluşturduğu bir
**küme (cluster)** halinde çalışır. İşte bu kümedeki her bağımsız Kafka süreci bir
broker'dır.

> **1 broker = 1 Kafka instance.**

Bir broker'ın üç temel işi vardır:

- **Mesajları alır:** Producer denen üreticilerden gelen veriyi teslim alır.
- **Mesajları saklar:** Bu veriyi disk üzerinde, sona eklemeli bir log olarak tutar.
- **Mesajları dağıtır:** Consumer denen tüketiciler veri istediğinde onlara iletir.

Buraya kadar kulağa "e bu bir veritabanı sunucusu gibi bir şey" diye geliyor. İşte ilk
yanılgı da tam burada başlıyor. Bir Oracle sunucusu **akıllı bir merkezdir**: sorguyu
parse eder, optimize eder, planlar, sonucu hesaplar. Kafka broker'ı ise kasıtlı olarak
**basit** tutulmuştur — esas olarak bir log tutar ve o log'u hızlıca okutur. Akıl,
birazdan göreceğimiz gibi, merkezde değil **client tarafındadır**.

## Topic = tablo mudur?

Oracle'dan gelince insanın ilk kurduğu denklem bu oluyor: "Topic dediğiniz şey aslında
tablo değil mi?" Cevap: **hem evet hem hayır.**

**Neden evet:** İlişkisel bir veritabanındaki tablo nasıl belirli bir konunun verisini
(`kullanicilar` tablosu) bir arada tutuyorsa, Kafka'daki topic de belirli bir türe ait
mesaj akışını (`kullanici_hareketleri` topic'i) bir arada tutar. İkisi de bir
**gruplama birimidir**.

**Neden hayır** — kritik farklar burada:

| Kriter | Tablo (Oracle) | Topic (Kafka) |
| --- | --- | --- |
| **Veri yapısı** | Satır/sütun; `UPDATE`/`DELETE` ile değiştirilir | Append-only log; veri sadece **sona eklenir**, geçmiş değişmez |
| **Süreklilik** | Sen silene kadar kalıcı | Genelde bir retention süresi sonunda (örn. 7 gün) otomatik düşer |
| **Amaç** | Mevcut **durumu** (state) tutar | Akıp giden **olayları** (event/stream) taşır |

Yani tablo "şu an dünyanın hali ne?" sorusunu; topic ise "sırayla neler oldu?"
sorusunu cevaplar. Oracle'da bir siparişin son statüsünü tek satırda görürsün; Kafka'da
ise o siparişin `oluşturuldu → ödendi → kargolandı` yolculuğunun **her adımı ayrı bir
event** olarak, sırayla log'da durur.

Burada bir parantez açmak lazım, yoksa haksızlık olur: Oracle'da da geçmişi
biriktirebilirsin — history/audit tabloları, journaling, `flashback` ya da elle tutulan
bir `siparis_log` tablosu bunun için vardır. Yani "durum tutmak" tablonun bir
kısıtlaması değil, **OLTP dünyasının tasarım geleneğidir**: OLTP sistemleri işlemin *son
halini* verimli tutup güncellemek üzere kurgulanır, geçmişi biriktirmek ekstra bir
tercihtir. Kafka'da ise denklem tersine döner — append-only log **varsayılan ve tek**
davranıştır; "üzerine yaz" diye bir seçenek zaten yoktur. Fark, "yapılabilir mi"
değil, **hangisinin doğal, hangisinin istisna** olduğudur.

> Tablo bir fotoğraftır; topic bir film şerididir.

Bir de teknik bir not: topic aslında **mantıksal** bir kavram. Fiziksel olarak veri,
topic'in bölündüğü **partition'larda** ve o partition'ların dağıldığı **broker'ların
diskinde** durur. Yani bir topic tek bir yerde duran bir dosya değildir; birden fazla
broker'a bölünerek yazılır. Bu dağılımın detayını
[ilk yazıda](/blog/kafka-cluster-mimarisi/) partition ve leader/replica üzerinden
anlatmıştım.

Bu ayrım da aslında Oracle'a yabancı değil. Oracle'da da tablo mantıksal bir
nesnedir; veri fiziksel olarak tablonun "içinde" değil, **data block**'larda tutulur
(block → extent → segment → **datafile**). Tablo, bu blokların üstünde duran bir
gösterim katmanıdır. Kabaca eşleştirirsek: Kafka'daki **topic**, Oracle'daki **tabloya**;
verinin gerçekten yazıldığı **partition/broker diski** ise Oracle'daki **block/datafile**
katmanına denk gelir. İki dünyada da "mantıksal isim" ile "fiziksel depolama" birbirinden
ayrıdır — sadece Kafka bu bölünmeyi birden fazla **makineye** yayar, Oracle ise (RAC
dışında) tek sunucunun datafile'larında tutar.

## Controller sunucu seçmek zorunlu mu?

Kısa cevap: **evet, zorunlu — adaylarını sen belirlersin ama aktif olanı Kafka seçer.**

Bir cluster'ın sağlıklı çalışabilmesi için arka planda mutlaka bir **controller**
olması gerekir. Controller görevini kümedeki node'lardan biri üstlenir ve o node kümenin
**yönetiminden** sorumlu olur: hangi broker ayakta, hangisi çöktü, çöken broker'daki
partition'ların yeni lideri kim olacak gibi kararları o verir ve diğer tüm broker'lara
tebliğ eder. Controller olmazsa kümede yönetim kaosu çıkar.

Ama şu yanlış anlaşılmayı hemen düzeltmek lazım: controller olmak, bir broker'ın **asıl
işinin yerine geçen** değil, çoğu zaman **üstüne binen** bir roldür. Yani aynı node hem
normal broker işini — partition tutma, producer/consumer trafiğini karşılama, yani
okuma/yazma — yapıp hem de controller görevini yürütebilir. İkisi birbirini dışlamaz.
Bunun iki farklı kurulumu var:

- **Combined (birleşik) mod:** Node hem `broker` hem `controller` rolündedir
  (`process.roles=broker,controller`). Hem veriyi okuyup yazar hem yönetimi üstlenir.
  ZooKeeper mimarisinde durum zaten hep böyleydi — aktif controller, seçilmiş **normal
  bir veri broker'ıydı** ve yönetimi asıl işinin üstüne alırdı. KRaft'ta da küçük ve
  geliştirme kümelerinde bu mod yaygındır.
- **Dedicated (ayrılmış) mod:** Yalnızca controller rolüyle çalışan
  (`process.roles=controller`) node'lar vardır; bunlar partition tutmaz, producer/consumer
  trafiği görmez — tek işleri metadata'yı yönetmektir. Büyük üretim kümelerinde önerilen
  budur, çünkü yönetim işi ağır veri yükünden **izole** edilmiş olur.

Yani "controller sadece yöneten bir kutudur" demek eksik olur: dedicated modda öyledir
ama combined modda o node aynı anda **hem veri broker'ı hem yöneticidir**.

Bir de seçim tarafını iki katmana ayırmak lazım, çünkü "seçiyorsun" da "seçmiyorsun" da
tek başına yanıltıcı:

- **Aday havuzunu sen belirlersin.** Özellikle KRaft'ta hangi broker'ların controller
  olabileceğini `process.roles` ve `controller.quorum.voters` ile **açıkça sen
  seçersin**. Yani "controller adayları şu üç node olsun" demek tamamen senin elinde.
- **O havuzdan aktif (lider) controller'ı Kafka seçer.** Adaylar arasından o an fiilen
  görevde olacak olanı ve bir çökme sonrası kimin devralacağını **elle sabitlemezsin** —
  buna Kafka kendi içinde karar verir.

Yani doğru ifade "sen hiç seçmezsin" değil; **adayları sen, aktif lideri Kafka.**

Bu ayrımın nasıl işlediği, Kafka'nın en çok değişen tarafı:

- **Eski mimari (ZooKeeper):** Broker'lar açıldığında ZooKeeper üzerinde bir yarışa
  girerdi; ilk yetişen controller olurdu. O çökerse ZooKeeper bunu algılar, kalanlar
  arasından yenisi seçilirdi.
- **Yeni mimari (KRaft — Kafka Raft Metadata Mode):** ZooKeeper tamamen devreden çıktı.
  Artık bazı broker'ları doğrudan **controller rolüyle** (`process.roles=controller`)
  başlatırsın; bunlar kendi aralarında bir **oylama** yaparak lider controller'ı seçer.

İşte bu oylamanın kalbindeki algoritma **Raft**. O yüzden bir sonraki durak orası.

> ZooKeeper'dan KRaft'a geçişi ve controller sayısının neden hep tek verildiğini
> ([split-brain](/blog/kafka-cluster-mimarisi/) meselesi) ilk yazıda ayrıca
> işlemiştim. Burada odak Raft'ın kendisinde.

## Raft konsensüs algoritması nedir?

**Raft**, birden fazla sunucunun tek bir sunucu gibi uyum içinde çalışmasını sağlayan
ve içlerinden bazıları çökse bile sistemin **doğru ve tutarlı** karar almaya devam
etmesini garanti eden bir protokoldür. Kafka'nın KRaft'ı, Kubernetes'in etcd'si ve pek
çok dağıtık sistem tutarlılığı bununla sağlar.

Raft'tan önce bu işin standardı **Paxos**'tu; ama o kadar karmaşıktı ki 2014'te
Stanford'dan araştırmacılar "anlaşılabilirlik" odaklı Raft'ı çıkardı. Üç sütun üzerinden
rahatça oturuyor:

### 1. Roller

Her sunucu, herhangi bir anda şu üç rolden **yalnızca birindedir**:

- **Leader (Lider):** Patron. İstemcilerden gelen tüm istekleri o karşılar, veriyi
  günlüğüne yazar, diğerlerine dağıtır.
- **Follower (Takipçi):** Pasiftir. Liderden geleni uygular, kendi verisini günceller.
- **Candidate (Aday):** Lider çöktüğünde, yeni lider olmak için seçime giren sunucu.

### 2. Lider seçimi

Sistem ilk açıldığında veya lider çöktüğünde bir seçim süreci başlar:

- Her takipçinin içinde **rastgele** bir zaman aşımı sayacı vardır (örn. 150–300 ms).
- Lider, ayakta olduğunu kanıtlamak için sürekli **heartbeat** (kalp atışı) gönderir.
- Bir takipçi bu süre boyunca liderden kalp atışı alamazsa "lider öldü" der, kendini
  **aday** ilan eder ve diğerlerinden oy ister.
- Kümenin **çoğunluğunun (quorum)** oyunu alan aday yeni lider olur.

Buradaki rastgele sayaç önemli: herkesin aynı anda aday olup oyları bölmesini engeller.

### 3. Günlük kopyalama (Log Replication)

Lider seçildikten sonra asıl iş — veri yazma — başlar ve tam bir emir-komuta zinciri
gibi işler:

```
1. İstek gelir     →  istemci lidere yazma isteği yollar (x = 5)
2. Taslak yazım    →  lider kendi log'una ekler ama "kesinleşti" DEMEZ
3. Emir yayılır    →  lider bu kaydı tüm takipçilere gönderir
4. Çoğunluk onayı  →  takipçilerin ÇOĞUNLUĞU "diskime yazdım" (ACK) der
5. Commit          →  lider veriyi "kesinleşti" işaretler, istemciye başarı döner
```

Kritik nokta 4. adım: lider tek başına değil, **çoğunluk onaylayınca** veriyi
kesinleştirir. Tutarlılık garantisi buradan gelir.

### Neden bu kadar güvenli? (Fault Tolerance)

Diyelim 5 sunuculu bir quorum'un var ve 2'si çöktü. Elinde kalan 3 sunucu, toplam 5'in
çoğunluğunu oluşturduğu için hemen yeni lider seçip **veri kaybı olmadan** çalışmaya
devam eder. Ama 3 sunucu birden çökerse, kalan 2 çoğunluğu sağlayamaz; sistem **veri
tutarsızlığını önlemek için** kendini kilitler ve yeni yazma kabul etmez. "Emin
değilsem yanlış yazmam" diyor.

Tolere edilen çökme sayısının neden `(N − 1) / 2` olduğunu ve bu yüzden controller
sayısının hep **tek** verildiğini [ilk yazıdaki quorum
tablosunda](/blog/kafka-cluster-mimarisi/) göstermiştim.

## 5 broker = 5 Kafka instance'ı

Şimdi kafada tam otursun diye somutlaştıralım. **5 broker'lı bir cluster**, arka planda
çalışan **5 bağımsız Kafka süreci** demektir. Ne bir eksik ne bir fazla. Kaç tane aktif
Kafka süreci çalıştırıyorsan, o kadar broker'ın var.

Peki bu 5 süreç fiziksel olarak nerede duruyor? İki senaryo var ve ikisini birbirine
karıştırmamak lazım:

- **Üretim (production):** 5 instance'ı **5 ayrı makineye** (fiziksel sunucu, VM ya da
  container) kurarsın. Amaç yüksek erişilebilirlik: biri donanımdan çökse, elektriği
  gitse, network'ü kopsa diğer 4'ü çalışmaya devam eder.
- **Geliştirme (local):** Kendi bilgisayarında, **tek makinede** 5 instance'ı ayağa
  kaldırabilirsin. Her birine farklı bir `broker.id` ve çakışmasınlar diye farklı bir
  **port** verirsin (9092, 9093, 9094, 9095, 9096). Ama bilgisayarın kapanınca
  doğal olarak hepsi birden gider — bu yüzden local'de gerçek dayanıklılık yoktur, sadece
  davranışı **simüle** edersin.

Somut bir örnek: 5 broker'ın var ve 5 partition'lı bir `siparisler` topic'i açtın
(replication factor = 2 olsun, yani her partition'ın 1 leader + 1 replica'sı var). İdeal
senaryoda Kafka hem 5 partition'ın **liderliğini** hem de birer **replica'sını** 5
broker'a dengeli dağıtır:

```
Broker 1  →  P0 (leader)    P4 (replica)
Broker 2  →  P1 (leader)    P0 (replica)
Broker 3  →  P2 (leader)    P1 (replica)
Broker 4  →  P3 (leader)    P2 (replica)
Broker 5  →  P4 (leader)    P3 (replica)
```

Dikkat: bir partition'ın leader'ı ile replica'sı **hiçbir zaman aynı broker'da** olmaz —
yoksa o broker çökünce hem leader hem yedek birden giderdi. Okuma/yazma yükü leader'lar
sayesinde 5 sürece eşit bölünürken, replica'lar da bir broker çöktüğünde liderliği
devralacak yedeği hazır tutar.

Eğer bu 5 broker aynı zamanda KRaft controller rolündeyse, Raft'a göre karar alabilmek
için gereken çoğunluk (quorum) `⌊5/2⌋ + 1 = 3`'tür. Yani 5 broker'ından 2'si çökse bile
kalan 3'ü sistemi ayakta tutar — yukarıda anlattığımız mekanizmanın ta kendisi.

## Lokaldeki portlar, prod'da nasıl gerçek sunucuya dönüşüyor?

Yukarıda "local'de port, prod'da ayrı makine" dedim. Peki geçiş tam olarak nasıl
oluyor? İşte Oracle refleksiyle en çok merak ettiğim şey buydu ve cevabı şaşırtıcı
derecede temiz.

Lokalde bir `docker-compose.yml` yazar, içine 3 (veya 5) broker tanımlar ve bunları
localhost'un farklı portlarına bağlarsın:

```
local
  broker 1 → localhost:9092
  broker 2 → localhost:9093
  broker 3 → localhost:9094
```

Amaç, yazdığın kodun **çok broker'lı** bir ortama nasıl tepki verdiğini kendi
makinende test etmek: "Bir broker'ı kapatırsam kodum patlıyor mu, yoksa öbür broker'a
sorunsuz mu geçiyor?"

Prod'a çıkınca artık portlar değil, **IP/DNS** konuşur. Her sunucuda standart Kafka
portu (9092) açıktır ama makineler ayrıdır:

```
prod
  broker 1 → 10.0.1.10:9092
  broker 2 → 10.0.1.11:9092
  broker 3 → 10.0.1.12:9092
```

Ve işin en güzel yeri:

> Local'den prod'a geçerken **kodun bir satırı bile değişmez.** Değişen tek şey
> konfigürasyondaki adres listesidir — localhost portları, gerçek sunucu IP'leriyle yer
> değiştirir.

## Peki bunu gerçek hayatta yazılımcılar nasıl kullanıyor?

Buraya kadar mekaniği kurduk. Ama Oracle'dan gelen birinin asıl "e bunu pratikte nasıl
kullanıyorlar?" dediği yer burası. İki farklı gözle bakalım.

### Yazılımcı gözünden: "bootstrap servers" ve akıllı client

Oracle'da bir uygulamayı bağlarken **tek bir connection string** verirsin
(`jdbc:oracle:thin:@//host:port/service`) ve o sunucuya bağlanırsın. Sunucu akıllıdır,
gerisini o halleder.

Kafka'da ise koda tek bir sunucu adresi yazmazsın. Bir **bootstrap servers** listesi
verirsin:

```
kafka.bootstrap.servers = "10.0.1.10:9092, 10.0.1.11:9092, 10.0.1.12:9092"
```

Sihir burada:

1. Uygulama (client) açılınca bu listedeki **herhangi bir** broker'a bağlanır.
2. Ona der ki: "Bana kümenin güncel haritasını (metadata) ver — hangi topic, hangi
   partition, hangi broker'da, kim leader?"
3. Broker bu haritayı gönderir, client onu kendi hafızasına alır.
4. Artık **client'ın kendisi** hangi verinin hangi broker'da olduğunu bilir. Bir veri
   yazacağı zaman doğrudan gidip o partition'ın **leader broker'ıyla** konuşur.

Fark tam da burada. Oracle'da akıl sunucudadır, client pasiftir. Kafka'da **akıl
client'tadır**; broker sadece log tutar. Bu yüzden araya bir load balancer koymana bile
gerek kalmaz — client zaten haritayı bildiği için doğru broker'a kendi gider. Bootstrap
listesine birden fazla adres yazmanın sebebi de şu: ilk bağlanmaya çalıştığın broker
çökmüş olabilir, client listedeki bir sonrakini dener.

### Veri mühendisi gözünden: gerçek zamanlı boru hatları

Senin Oracle geçmişinden bildiğin **ETL** süreçlerini (gece batch'leriyle veri taşıma)
veri mühendisleri Kafka ile **real-time** hale getirir. Klasik senaryo:

```
1. Müşteri sepete ürün ekler          →  bir "event" üretilir (Producer)
2. Event 'sepet_hareketleri' topic'ine yazılır
3. Bir işleme uygulaması topic'i dinler (Consumer: Flink / Spark / Kafka Connect)
4. Veri anlık işlenir, temizlenir
5. Analiz için Snowflake/BigQuery'ye, ya da senin bildiğin bir Oracle/PostgreSQL'e yazılır
```

Yani Kafka çoğu zaman "son durak" değil, sistemler arasındaki **gerçek zamanlı taşıma
katmanıdır**. Kaynaktaki değişikliğin (CDC ile) anında yakalanıp bu boru hattına nasıl
girdiğini [ilk yazıda](/blog/kafka-cluster-mimarisi/) anlatmıştım.

## Özet: Oracle ↔ Kafka

Kafamdaki client-server modelini Kafka'ya çevirirken bana en çok yardımcı olan tablo bu
oldu:

| Kriter | Oracle (Client-Server) | Kafka (Dağıtık Event Stream) |
| --- | --- | --- |
| **Merkez** | Akıllı, güçlü tek bir veritabanı sunucusu | Sadece log tutan, basit ama çok hızlı broker'lar |
| **İstemci** | Sorgu atar, sonucu bekler (pasif) | Kümenin haritasını bilir, nereye yazıp okuyacağını kendi yönetir (aktif) |
| **Veri** | Tabloda **duran** (at rest) veri sorgulanır | Sürekli **akan** (in motion) veri anlık yakalanır |
| **Ölçekleme** | Dikey (daha güçlü makine) ağırlıklı | Yatay — küme'ye broker ekleyerek |

Broker'ı bir cümleyle bağlamak gerekirse: **Kafka'yı devasa bir lojistik firması gibi
düşün.** Topic'ler kargo hatları, partition'lar kamyonlar, broker'lar ise bu kamyonların
park ettiği, kargonun tasnif edilip dağıtıldığı **ana depolar**. Depo (broker) sayısını
ne kadar artırırsan, o kadar çok kargoyu (veriyi) sorunsuz taşırsın. Yeter ki depolardan
birinin başına iş gelince diğerleri devralabilsin diye kargonun bir kopyası birkaç
depoda birden dursun — ki bunun adı da **replication**.

Bu yazıyla serinin en alttaki temel taşını — broker'ın kendisini — yerine oturtmuş
olduk. Bir sonraki yazıda, bu broker'lara dağıtılmış veriyi consumer tarafında nasıl
ölçekli okuduğumuza — **consumer group**'lar, rebalancing ve offset commit
stratejilerine — daha yakından bakacağız.
