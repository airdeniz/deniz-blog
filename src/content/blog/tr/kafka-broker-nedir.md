---
title: 'Kafka Broker''ını Oracle Gözüyle Anlamak'
description: 'Kafka serisinin dördüncü yazısı: broker gerçekte ne iş yapar? Topic bir tablonun karşılığı mı, controller seçimi zorunlu mu, Raft konsensüs nasıl işler, 5 broker = 5 instance ne anlama gelir ve lokaldeki portlar prod''da nasıl gerçek sunuculara dönüşür? Broker kavramı, Oracle''ın client-server dünyasından gelen biri için sıfırdan kuruluyor.'
pubDate: 2026-07-05
tags: ['Kafka', 'Broker', 'KRaft', 'Raft', 'Dağıtık Sistemler', 'Backend']
draft: false
---

Bu yazı, Kafka serisinin dördüncü parçası. İlk üç yazıda bir cluster'ın nasıl
kurulduğunu ([1. yazı](/blog/kafka-cluster-mimarisi/)), bir mesajın hangi partition'a
düşüp offset'le nasıl sıralandığını ([2. yazı](/blog/kafka-partition-offset-siralama/))
ve bu kararı veren partitioner'ları ([3. yazı](/blog/kafka-partitioner-cesitleri/))
ele almıştık. Üçünde de broker sahnedeydi; ama hep başka kavramların — partition,
leader, KRaft — gölgesinde kaldı. Bu yazıda kamera doğrudan **broker'a** dönüyor.

Belli bir çıkış noktamız var: **Oracle ekosisteminden** gelen birinin zihninde,
yıllar içinde iyice yerleşmiş bir **client-server** modeli vardır. Kafka'ya ilk
bakışta insanı en çok şaşırtan da bu modelin geçerli olmamasıdır. Bu yüzden broker'ı
sıfırdan, Oracle refleksleriyle karşılaştıra karşılaştıra kuracağız.

## Broker nedir?

En yalın tanımıyla: **broker, çalışan tek bir Kafka sürecidir (instance).** Kafka
genellikle tek başına değil, yan yana çalışan birden fazla sürecin oluşturduğu bir
**küme (cluster)** halinde koşar. Bu kümedeki her bağımsız Kafka süreci bir
broker'dır.

> **1 broker = 1 Kafka instance.**

Bir broker'ın üç temel görevi vardır:

- **Mesajları alır:** Producer'lardan gelen veriyi teslim alır.
- **Mesajları saklar:** Bu veriyi diskte, sona eklemeli (append-only) bir log
  olarak tutar.
- **Mesajları dağıtır:** Consumer'lar veri istediğinde onlara iletir.

Buraya kadar "bu da bir tür veritabanı sunucusu" izlenimi doğabilir. İlk yanılgı
tam burada başlar. Bir Oracle sunucusu **akıllı bir merkezdir**: sorguyu parse
eder, optimize eder, planlar, sonucu hesaplar. Kafka broker'ı ise bilinçli olarak
**basit** tutulmuştur — esas işi bir log tutmak ve o log'u hızla okutmaktır. Akıl,
birazdan göreceğimiz gibi, merkezde değil **client tarafındadır**.

## Topic bir tablo mudur?

Oracle'dan gelen birinin kurduğu ilk denklem genellikle şudur: "Topic dediğiniz
şey aslında tablo değil mi?" Cevap: **hem evet hem hayır.**

**Neden evet:** İlişkisel bir veritabanındaki tablo nasıl belirli bir konunun
verisini (`kullanicilar` tablosu) bir arada tutuyorsa, Kafka'daki topic de belirli
bir türe ait mesaj akışını (`kullanici_hareketleri` topic'i) bir arada tutar.
İkisi de birer **gruplama birimidir**.

**Neden hayır** — kritik farklar şunlar:

| Kriter | Tablo (Oracle) | Topic (Kafka) |
| --- | --- | --- |
| **Veri yapısı** | Satır/sütun; `UPDATE`/`DELETE` ile değiştirilir | Append-only log; veri sadece **sona eklenir**, geçmiş değişmez |
| **Süreklilik** | Silinene kadar kalıcı | Genelde bir retention süresi sonunda (örn. 7 gün) otomatik düşer |
| **Amaç** | Mevcut **durumu** (state) tutar | Akıp giden **olayları** (event/stream) taşır |

Tablo "dünyanın şu anki hali ne?" sorusuna cevap verir; topic ise "sırayla neler
oldu?" sorusuna. Oracle'da bir siparişin son durumu tek satırda görünür; Kafka'da
o siparişin `oluşturuldu → ödendi → kargolandı` yolculuğunun **her adımı ayrı bir
event** olarak, sırasıyla log'da durur.

Burada bir parantez açmak gerekiyor, yoksa Oracle'a haksızlık olur: geçmiş orada
da biriktirilebilir — history/audit tabloları, journaling, `flashback` ya da elle
tutulan bir `siparis_log` tablosu tam bunun içindir. Yani "durum tutmak" tablonun
bir kısıtı değil, **OLTP dünyasının tasarım geleneğidir**: OLTP sistemleri işlemin
*son halini* verimli tutup güncellemek üzere kurgulanır; geçmişi biriktirmek ek
bir tercihtir. Kafka'da denklem tersine döner — append-only log **varsayılan ve
tek** davranıştır; "üzerine yaz" diye bir seçenek zaten yoktur. Fark "yapılabilir
mi" sorusunda değil, **hangisinin doğal, hangisinin istisna** olduğundadır.

> Tablo bir fotoğraftır; topic bir film şerididir.

Bir de teknik not: topic aslında **mantıksal** bir kavramdır. Fiziksel olarak
veri, topic'in bölündüğü **partition'larda** ve o partition'ların dağıldığı
**broker'ların diskinde** durur. Yani topic, tek bir yerde duran bir dosya
değildir; birden fazla broker'a bölünerek yazılır. Bu dağılımın ayrıntısı
[ilk yazıda](/blog/kafka-cluster-mimarisi/) partition ve leader/replica üzerinden
anlatılmıştı.

Bu ayrım Oracle'a da yabancı değildir. Orada da tablo mantıksal bir nesnedir;
veri fiziksel olarak tablonun "içinde" değil, **data block**'larda tutulur
(block → extent → segment → **datafile**). Tablo, bu blokların üzerinde duran bir
gösterim katmanıdır. Kabaca eşleştirirsek: Kafka'daki **topic**, Oracle'daki
**tabloya**; verinin gerçekten yazıldığı **partition/broker diski** ise Oracle'daki
**block/datafile** katmanına denk gelir. İki dünyada da "mantıksal isim" ile
"fiziksel depolama" birbirinden ayrıdır — yalnızca Kafka bu bölünmeyi birden fazla
**makineye** yayar, Oracle ise (RAC dışında) tek sunucunun datafile'larında tutar.

## Controller sunucu seçmek zorunlu mu?

Kısa cevap: **evet — adayları geliştirici belirler, aktif olanı Kafka seçer.**

Bir cluster'ın sağlıklı çalışması için arka planda mutlaka bir **controller**
bulunmalıdır. Bu görevi kümedeki node'lardan biri üstlenir ve kümenin
**yönetiminden** sorumlu olur: hangi broker ayakta, hangisi çöktü, çöken
broker'daki partition'ların yeni lideri kim olacak gibi kararları o verir ve tüm
broker'lara duyurur. Controller olmadan kümede yönetim boşluğu doğar.

Yaygın bir yanlış anlamayı hemen düzeltelim: controller olmak, bir broker'ın
**asıl işinin yerine geçen** değil, çoğu zaman **üstüne eklenen** bir roldür.
Aynı node hem normal broker işini — partition tutma, producer/consumer trafiğini
karşılama, yani okuma/yazma — yapabilir hem de controller görevini yürütebilir.
İkisi birbirini dışlamaz. Bunun iki farklı kurulumu vardır:

- **Combined (birleşik) mod:** Node hem `broker` hem `controller` rolündedir
  (`process.roles=broker,controller`). Hem veriyi okuyup yazar hem yönetimi
  üstlenir. ZooKeeper mimarisinde durum zaten hep böyleydi — aktif controller,
  seçilmiş **normal bir veri broker'ıydı** ve yönetimi asıl işinin üstüne alırdı.
  KRaft'ta da küçük kümelerde ve geliştirme ortamlarında bu mod yaygındır.
- **Dedicated (ayrılmış) mod:** Yalnızca controller rolüyle çalışan
  (`process.roles=controller`) node'lar vardır; bunlar partition tutmaz,
  producer/consumer trafiği görmez — tek işleri metadata'yı yönetmektir. Büyük
  üretim kümelerinde önerilen budur, çünkü yönetim işi ağır veri yükünden
  **izole** edilir.

Dolayısıyla "controller sadece yöneten bir kutudur" demek eksik kalır: dedicated
modda öyledir, ama combined modda o node aynı anda **hem veri broker'ı hem
yöneticidir**.

Seçim tarafını da iki katmana ayırmak gerekir; çünkü "seçilir" de "seçilmez" de
tek başına yanıltıcıdır:

- **Aday havuzunu geliştirici belirler.** Özellikle KRaft'ta hangi broker'ların
  controller olabileceği `process.roles` ve `controller.quorum.voters` ile
  **açıkça tanımlanır**. "Controller adayları şu üç node olsun" demek tamamen
  geliştiricinin elindedir.
- **O havuzdan aktif (lider) controller'ı Kafka seçer.** O an fiilen görevde olan
  aday ve bir çökme sonrası görevi devralacak olan **elle sabitlenmez** — bu
  kararı Kafka kendi içinde verir.

Doğru ifade "hiç seçilmez" değil; **adayları geliştirici belirler, aktif lideri
Kafka seçer.**

Bu mekanizmanın işleyişi, Kafka'nın en çok değişen tarafı:

- **Eski mimari (ZooKeeper):** Broker'lar açıldığında ZooKeeper üzerinde bir
  yarışa girerdi; ilk yetişen controller olurdu. O çökerse ZooKeeper bunu algılar,
  kalanlar arasından yenisi seçilirdi.
- **Yeni mimari (KRaft — Kafka Raft Metadata Mode):** ZooKeeper tamamen devre
  dışı. Artık bazı node'lar doğrudan **controller rolüyle**
  (`process.roles=controller`) başlatılır; bunlar kendi aralarında bir **oylama**
  yaparak lider controller'ı seçer.

Bu oylamanın kalbindeki algoritma **Raft**. Sıradaki durak orası.

> ZooKeeper'dan KRaft'a geçiş ve controller sayısının neden hep tek verildiği
> ([split-brain](/blog/kafka-cluster-mimarisi/) meselesi) ilk yazıda ayrıca
> işlenmişti. Burada odak Raft'ın kendisinde.

## Raft konsensüs algoritması nedir?

**Raft**, birden fazla sunucunun tek bir sunucu gibi uyum içinde çalışmasını
sağlayan ve içlerinden bazıları çökse bile sistemin **doğru ve tutarlı** karar
almaya devam etmesini garanti eden bir protokoldür. Kafka'nın KRaft'ı,
Kubernetes'in etcd'si ve daha pek çok dağıtık sistem, tutarlılığı bununla sağlar.

Raft'tan önce bu işin standardı **Paxos**'tu; ancak o kadar karmaşıktı ki 2014'te
Stanford'dan araştırmacılar, "anlaşılabilirlik" hedefiyle Raft'ı yayımladı.
Algoritma üç sütun üzerine oturur:

### 1. Roller

Her sunucu, herhangi bir anda şu üç rolden **yalnızca birindedir**:

- **Leader (Lider):** Yöneten taraf. İstemcilerden gelen tüm istekleri karşılar,
  veriyi kendi log'una yazar, diğerlerine dağıtır.
- **Follower (Takipçi):** Pasiftir. Liderden geleni uygular, kendi verisini
  günceller.
- **Candidate (Aday):** Lider çöktüğünde yeni lider olmak için seçime giren
  sunucu.

### 2. Lider seçimi

Sistem ilk açıldığında veya lider çöktüğünde bir seçim süreci başlar:

- Her takipçinin içinde **rastgele** bir zaman aşımı sayacı vardır (örn. 150–300 ms).
- Lider, ayakta olduğunu kanıtlamak için sürekli **heartbeat** (kalp atışı)
  gönderir.
- Bir takipçi bu süre boyunca liderden kalp atışı alamazsa lideri ölmüş kabul
  eder, kendini **aday** ilan eder ve diğerlerinden oy ister.
- Kümenin **çoğunluğunun (quorum)** oyunu alan aday yeni lider olur.

Rastgele sayaç burada kritik bir rol oynar: herkesin aynı anda aday olup oyları
bölmesini engeller.

### 3. Günlük kopyalama (Log Replication)

Lider seçildikten sonra asıl iş — veri yazma — başlar ve süreç net bir
emir-komuta zinciri gibi işler:

```
1. İstek gelir     →  istemci lidere yazma isteği yollar (x = 5)
2. Taslak yazım    →  lider kendi log'una ekler ama "kesinleşti" DEMEZ
3. Emir yayılır    →  lider bu kaydı tüm takipçilere gönderir
4. Çoğunluk onayı  →  takipçilerin ÇOĞUNLUĞU "diskime yazdım" (ACK) der
5. Commit          →  lider veriyi "kesinleşti" işaretler, istemciye başarı döner
```

Kritik nokta 4. adımdır: lider veriyi tek başına değil, **çoğunluk onayladığında**
kesinleştirir. Tutarlılık garantisi buradan gelir.

### Neden bu kadar güvenli? (Fault Tolerance)

Diyelim 5 sunuculu bir quorum var ve 2'si çöktü. Kalan 3 sunucu, toplam 5'in
çoğunluğunu oluşturduğu için hemen yeni lider seçer ve **veri kaybı olmadan**
çalışmaya devam eder. Ama 3 sunucu birden çökerse kalan 2 çoğunluğu sağlayamaz;
sistem **veri tutarsızlığını önlemek için** kendini kilitler ve yeni yazma kabul
etmez. Kural basittir: emin olmayan sistem, yanlış yazmaktansa hiç yazmaz.

Tolere edilen çökme sayısının neden `(N − 1) / 2` olduğu ve controller sayısının
bu yüzden hep **tek** verildiği, [ilk yazıdaki quorum
tablosunda](/blog/kafka-cluster-mimarisi/) gösterilmişti.

## 5 broker = 5 Kafka instance'ı

Kavramı somutlaştıralım. **5 broker'lı bir cluster**, arka planda çalışan **5
bağımsız Kafka süreci** demektir — ne bir eksik ne bir fazla. Kaç aktif Kafka
süreci çalışıyorsa o kadar broker vardır.

Peki bu 5 süreç fiziksel olarak nerede durur? İki senaryo var ve ikisini
birbirine karıştırmamak gerekir:

- **Üretim (production):** 5 instance **5 ayrı makineye** (fiziksel sunucu, VM ya
  da container) kurulur. Amaç yüksek erişilebilirliktir: biri donanım arızasıyla
  çökse, elektriği kesilse ya da network'ü kopsa diğer 4'ü çalışmaya devam eder.
- **Geliştirme (local):** Tek bilgisayarda, **tek makinede** 5 instance ayağa
  kaldırılabilir. Her birine farklı bir `broker.id` ve çakışmasınlar diye farklı
  bir **port** verilir (9092, 9093, 9094, 9095, 9096). Ama bilgisayar kapanınca
  hepsi birden gider — bu yüzden local'de gerçek dayanıklılık yoktur; davranış
  yalnızca **simüle** edilir.

Somut bir örnek: 5 broker var ve 5 partition'lı bir `siparisler` topic'i açıldı
(replication factor = 2 olsun; yani her partition'ın 1 leader + 1 replica'sı
var). İdeal senaryoda Kafka hem 5 partition'ın **liderliğini** hem de birer
**replica'sını** 5 broker'a dengeli dağıtır:

```
Broker 1  →  P0 (leader)    P4 (replica)
Broker 2  →  P1 (leader)    P0 (replica)
Broker 3  →  P2 (leader)    P1 (replica)
Broker 4  →  P3 (leader)    P2 (replica)
Broker 5  →  P4 (leader)    P3 (replica)
```

Dikkat: bir partition'ın leader'ı ile replica'sı **hiçbir zaman aynı broker'da**
durmaz — aksi halde o broker çöktüğünde hem leader hem yedek birlikte giderdi.
Okuma/yazma yükü leader'lar sayesinde 5 sürece eşit bölünürken, replica'lar da
bir broker çöktüğünde liderliği devralacak yedeği hazır tutar.

Bu 5 broker aynı zamanda KRaft controller rolündeyse, Raft'a göre karar almak
için gereken çoğunluk (quorum) `⌊5/2⌋ + 1 = 3` olur. Yani 5 broker'dan 2'si
çökse bile kalan 3'ü sistemi ayakta tutar — yukarıda anlatılan mekanizmanın ta
kendisi.

## Lokaldeki portlar, prod'da nasıl gerçek sunuculara dönüşür?

Yukarıda "local'de port, prod'da ayrı makine" demiştik. Peki bu geçiş tam olarak
nasıl olur? Oracle refleksiyle en çok merak edilen nokta budur ve cevabı
şaşırtıcı derecede temizdir.

Lokalde bir `docker-compose.yml` yazılır, içine 3 (veya 5) broker tanımlanır ve
bunlar localhost'un farklı portlarına bağlanır:

```
local
  broker 1 → localhost:9092
  broker 2 → localhost:9093
  broker 3 → localhost:9094
```

Amaç, yazılan kodun **çok broker'lı** bir ortama nasıl tepki verdiğini kendi
makinede test etmektir: bir broker kapatıldığında kod çöküyor mu, yoksa öbür
broker'a sorunsuz geçiyor mu?

Prod'a çıkıldığında artık portlar değil, **IP/DNS** konuşur. Her sunucuda
standart Kafka portu (9092) açıktır; ayrı olan makinelerdir:

```
prod
  broker 1 → 10.0.1.10:9092
  broker 2 → 10.0.1.11:9092
  broker 3 → 10.0.1.12:9092
```

Ve işin en zarif tarafı:

> Local'den prod'a geçerken **kodun tek bir satırı bile değişmez.** Değişen tek
> şey konfigürasyondaki adres listesidir — localhost portları, gerçek sunucu
> IP'leriyle yer değiştirir.

## Bunu gerçek hayatta yazılımcılar nasıl kullanıyor?

Buraya kadar mekaniği kurduk. Oracle'dan gelen birinin asıl sorusu ise şudur:
"Peki pratikte bu nasıl kullanılıyor?" İki farklı gözle bakalım.

### Yazılımcı gözünden: "bootstrap servers" ve akıllı client

Oracle'da bir uygulama bağlanırken **tek bir connection string** verilir
(`jdbc:oracle:thin:@//host:port/service`) ve o sunucuya bağlanılır. Sunucu
akıllıdır; gerisini o halleder.

Kafka'da ise koda tek bir sunucu adresi yazılmaz. Bir **bootstrap servers**
listesi verilir:

```
kafka.bootstrap.servers = "10.0.1.10:9092, 10.0.1.11:9092, 10.0.1.12:9092"
```

Asıl mekanizma şöyle işler:

1. Uygulama (client) açılınca listedeki **herhangi bir** broker'a bağlanır.
2. Ondan kümenin güncel haritasını (metadata) ister: hangi topic, hangi
   partition, hangi broker'da, leader kim?
3. Broker bu haritayı gönderir; client onu kendi hafızasına alır.
4. Artık **client'ın kendisi** hangi verinin hangi broker'da olduğunu bilir. Veri
   yazacağı zaman doğrudan o partition'ın **leader broker'ıyla** konuşur.

Fark tam buradadır. Oracle'da akıl sunucudadır, client pasiftir. Kafka'da **akıl
client'tadır**; broker sadece log tutar. Bu yüzden araya bir load balancer
koymaya bile gerek kalmaz — client haritayı bildiği için doğru broker'a kendisi
gider. Bootstrap listesine birden fazla adres yazılmasının sebebi de şudur: ilk
denenen broker çökmüş olabilir; client listedeki bir sonrakini dener.

### Veri mühendisi gözünden: gerçek zamanlı boru hatları

Oracle geçmişinden gelen birinin bildiği **ETL** süreçlerini (gece batch'leriyle
veri taşıma) veri mühendisleri Kafka ile **real-time** hale getirir. Klasik
senaryo:

```
1. Müşteri sepete ürün ekler          →  bir "event" üretilir (Producer)
2. Event 'sepet_hareketleri' topic'ine yazılır
3. Bir işleme uygulaması topic'i dinler (Consumer: Flink / Spark / Kafka Connect)
4. Veri anlık işlenir, temizlenir
5. Analiz için Snowflake/BigQuery'ye, ya da tanıdık bir Oracle/PostgreSQL'e yazılır
```

Yani Kafka çoğu zaman "son durak" değil, sistemler arasındaki **gerçek zamanlı
taşıma katmanıdır**. Kaynaktaki değişikliğin (CDC ile) anında yakalanıp bu boru
hattına nasıl girdiği [ilk yazıda](/blog/kafka-cluster-mimarisi/) anlatılmıştı.

## Özet: Oracle ↔ Kafka

Client-server modelini Kafka'ya çevirirken en çok işe yarayan tablo şu:

| Kriter | Oracle (Client-Server) | Kafka (Dağıtık Event Stream) |
| --- | --- | --- |
| **Merkez** | Akıllı, güçlü tek bir veritabanı sunucusu | Sadece log tutan, basit ama çok hızlı broker'lar |
| **İstemci** | Sorgu atar, sonucu bekler (pasif) | Kümenin haritasını bilir, nereye yazıp okuyacağını kendi yönetir (aktif) |
| **Veri** | Tabloda **duran** (at rest) veri sorgulanır | Sürekli **akan** (in motion) veri anlık yakalanır |
| **Ölçekleme** | Dikey (daha güçlü makine) ağırlıklı | Yatay — kümeye broker ekleyerek |

Broker'ı tek cümleyle bağlamak gerekirse: **Kafka, devasa bir lojistik firması
gibi düşünülebilir.** Topic'ler kargo hatları, partition'lar kamyonlar,
broker'lar ise bu kamyonların park ettiği, kargonun tasnif edilip dağıtıldığı
**ana depolardır**. Depo (broker) sayısı arttıkça daha çok kargo (veri) sorunsuz
taşınır — yeter ki depolardan birinin başına iş geldiğinde diğerleri devralsın
diye kargonun bir kopyası birkaç depoda birden dursun. Bunun adı da
**replication**.

Bu yazıyla serinin en alttaki temel taşını — broker'ın kendisini — yerine
oturttuk. Bir sonraki yazıda, bu broker'lara dağılmış veriyi consumer tarafında
nasıl ölçekli okuduğumuza — **consumer group**'lara, rebalancing'e ve offset
commit stratejilerine — daha yakından bakacağız.
