---
title: 'Bir Kafka Cluster''ı Nasıl Çalışır?'
description: 'Bir Kafka cluster mimarisini; broker, partition, leader/replica, CDC ile veri akışı, hash tabanlı partition seçimi, offset ve retention kavramları üzerinden kendi anlatımımla ele alıyorum.'
pubDate: 2026-07-02
tags: ['Kafka', 'Cluster', 'CDC', 'Dağıtık Sistemler', 'Backend']
draft: false
---

Bu yazıda bir Kafka cluster'ının nasıl çalıştığını kendi cümlelerimle anlatmaya
çalışacağım. Örnek olarak **3 broker'lı** bir cluster üzerinden gideceğiz.
Önce şu temel eşitliği aklımızda tutalım:

> **1 broker = 1 Kafka servisi.**

## Neden birden fazla broker'a ihtiyacımız var?

Peki neden birden fazla Kafka servisine ve bunların paralel çalışmasına ihtiyaç
duyuyoruz? Çünkü tek bir servis, ihtiyacımız olan I/O gücünü, ağ gücünü, RAM ve
işlemci gücünü bize sağlamakta yetmeyebilir. Elinizde en iyi makine de olsa, günün
sonunda **donanımsal limitlere** takılacaksınız.

Bu sebeple birbirinden izole birden fazla broker'a sahip olabilirsiniz:

- Aynı Docker Compose içinde tanımlı, birbirinden ayrı konteynerlerde çalışan brokerlar,
- Aynı makinede birbirinden tamamen izole birden fazla broker,
- Ayrı sunucularda birbirinden izole brokerlar.

Buradaki izolasyon **runtime ile alakalıdır**; datasal bakış açısıyla brokerlar
birbirinden tamamen ayrı değildir. Lider seçme, metadata senkronizasyonu gibi
ihtiyaçlar sebebiyle sürekli birbirleriyle iletişim halindedirler. Buradaki
ayrılıktan kasıt şu: her broker aslında **kendi CPU'sunda, kendi belleğinde** çalışır.

## Veriyi neden dağıtıyoruz?

Burada asıl ihtiyacımız olan şey **veri dağıtma gücünü** sağlamaktır. Peki veriyi
neden dağıtıyoruz? Çünkü kaynakta üretilen bu veriyi işlemek istiyoruz ve veriyi
işlemeden önce üretildiği yerden alıp başka servislere taşımak istiyoruz — ki
üretim yapan yazılımlar kendi işlerine odaklanabilsin.

Kafka tam da burada devreye giriyor. Bir sipariş sisteminde bir sipariş
oluştuğunda, aynı event'i farklı **consumer group**'lar (buna değineceğiz)
okuyabilir:

- Biri ödeme servisine iletir,
- Biri kargo servisini tetikler,
- Biri müşteriye bildirim e-postası gönderir.

Hepsi aynı topic'ten, aynı event'ten data alıp **farklı işler** için kullanıyor.
Örneğin bir stok alert servisiniz olsun. Buraya data sağlayan bir Kafka servisi
olursa, bir ürünün stoku 10 adetin altına düştüğünde bunu Slack'ten veya başka bir
uygulama üzerinden ilgili ekibe alert geçmesi için bir servis tetikletebilirsiniz.

## Kafka, kaynaktaki değişiklikleri nasıl anlıyor?

Peki Kafka; üretim tarafında gerçekleşen yeni bir siparişi, siparişin statü
değişikliğini veya bu siparişin sistemden silindiğini nasıl anlıyor? İşte burada
devreye **CDC (Change Data Capture)** toolları giriyor.

Bir şirket bu noktada üç yol izleyebilir:

- Kendi CDC tool'unu geliştirebilir,
- Open source bir CDC tool'u kullanabilir (örneğin **Debezium**),
- Bir vendor'den satın alabilir (örneğin **Oracle GoldenGate**).

Bu CDC toolları, kaynak veritabanındaki herhangi bir DML işlemini anında
loglardan okur:

- PostgreSQL'de **WAL** (bunun için WAL log seviyesi = `logical` olmalıdır),
- Oracle'da **redo log**.

Ve datayı Kafka'ya aktarır. Bu datayı update işlemlerinde hem **before** hem
**after** olarak aktarır. Mantık şöyle işler:

| İşlem | before | after |
| --- | --- | --- |
| **INSERT** | — (sistemde önceki kayıt yok) | dolu |
| **UPDATE** | dolu | dolu |
| **DELETE** | dolu | — (satır silindiği için içerik yok) |

Yani sistemde daha önce olmayan yeni bir kayıt oluştuğunda before olamaz; ilgili
offset'teki mesajda sadece after bulunur. Delete işleminde ise satır silindiği
için sadece before dolu gelir.

CDC tool'u bunu her tablodaki **unique bir kolon (key)** veya kolonlar ile takip
eder. Eğer kaynak tarafında böyle bir tanımlama yapılmadıysa, o zaman tüm kolonlar
unique'liği sağlıyormuşçasına davranır — ki bu pek istenen bir durum değildir.

Kafka'ya akan bu datayı ister Kafka UI aracından, isterseniz 3. parti araçlardan
(örneğin **Redpanda**) görüntüleyebilirsiniz.

## Cluster içinde partition ve broker dağılımı

Şimdi cluster'daki duruma geri dönelim. 3 adet broker'ımız olsun: **Broker1,
Broker2, Broker3**. `orders` adında bir topic oluşturup ona **3 partition**
verdiğimizi düşünelim: **P0, P1, P2**.

Burada dikkat: topic **mantıksal** bir kavramdır. Asıl odaklanılması gereken yer
**partition'lar ve broker'lardır**. Yükün dengeli dağıtıldığı bir senaryoda her
broker'da 2 partition bulunur:

```
Broker 1   →   P0 (leader)    P2 (replica)
Broker 2   →   P1 (leader)    P0 (replica)
Broker 3   →   P2 (leader)    P1 (replica)
```

### Leader ve replica nedir?

Peki buradaki **leader** ve **replica** kavramı nedir?

- Bir partition bir broker'da **leader** pozisyonundaysa, o partition için yazma
  ve okuma işlemlerini o broker yapıyor demektir.
- Bir partition bir broker'da **replica** modundaysa, buna aynı zamanda
  **follower** partition da denir. Follower'lar kendi leader partition'larından
  sürekli veri çeker.

Bu çekme işlemi periyodik bir yenilemeden ziyade neredeyse **gerçek zamanlı akan**
bir veri akışıdır. Bir süre vermek gerekirse, default ayarlarda bu süre **500 ms**'dir.

> Bir partition birden fazla broker'da lider olamaz.

### Replication factor

Bir partition'ın kaç replica'sı olacağını **replication factor** parametresi
belirler:

- **replication factor = 2** → 1 leader + 1 replica. (Yukarıdaki örneğimiz buydu.)
- **replication factor = 3** → 1 leader + 2 replica.

Gerçek dünyada genelde **replication factor = 3** değeri baz alınır.

Bir broker'da birden fazla replica partition olabilir; Kafka'nın buna bir sınırı
yoktur. Sınır tamamen broker'ın donanımsal kapasitesiyle belirlenir: disk, RAM,
CPU, ağ bant genişliği.

## Consumer group

Consumer group'a gelecek olursak; burada kastedilen şey, **aynı topic'i okuyan
ama farklı işler yapan servis gruplarıdır**. Bir servis Kafka'dan gelen datayı
raporlama akışına yönlendirirken, bir diğer servis aynı data ile bir e-mail
gönderebilir.

## Bir mesaj hangi partition'a yazılır?

Kafka'da bir mesajın hangi partition'a yazılacağı **hash mekanizması** ile
belirlenir. Buradaki hash, aslında belli bir takım matematiksel işlemi ifade eder.
Ve bir **key** (burada `order_id`) her zaman tek bir partition'a yazılır.

`order` tablosunda `order_id` key ise, `order_id = 5` olan sipariş her zaman belli
bir partition'a yazılır. Yazılacağı partition şu mekanizma ile belirlenir:

```
hedef partition = hash(key) % partition_sayısı
```

Diyelim 3 partition var (P0, P1, P2) ve key olarak `order_id` kullanılıyor:

```
order_id = 5   →  hash(5)  = 7634  →  7634 % 3 = 1  →  P1
order_id = 12  →  hash(12) = 4821  →  4821 % 3 = 0  →  P0
order_id = 5   →  hash(5)  = 7634  →  7634 % 3 = 1  →  P1 (yine!)
```

Aynı girdi her zaman aynı çıktıyı üretir. Bu yüzden `order_id = 5` her seferinde
P1'e düşer. Böylece aynı siparişe ait tüm event'ler hep aynı partition'da
**sıralı** kalır.

### Partition sayısını en baştan doğru seçin

Fakat bu partition sayısı, sistem kurulurken çok iyi tespit edilmelidir. İhtiyaç 3
ise, gelecekte daha fazla kapasite gerekebileceğinden en az **12 veya 24**
partition seçilmelidir.

Sebep: partition sayısını artırmak (ki partition sayısı **azaltılamaz**), hash
mekanizmasının farklı sonuçlar üretmesine sebep olur. Çünkü partition sayısının
hesaplamadaki rolü kritiktir. Eğer hesaplama değişirse, bu sefer `order_id = 5`
siparişi P1'e gitmez ve belki de P2'ye düşer.

Ve Kafka **sıralama garantisini sadece aynı partition içinde** verir. Aynı
siparişin event'leri iki farklı partition'a dağılırsa, sıra (offset) karışabilir.

## Offset

Her partition'a yazılan mesaj, sıralı bir **offset** numarası alır: 0, 1, 2, 3…
Consumer bir partition'ı okuduğunda, mesajları bu offset sırasıyla okur.

Burada bilmemiz gereken önemli bir konu daha var: tek bir Kafka topic'i
**birden fazla kaynaktan** beslenebilir. Örneğin iki farklı PostgreSQL, birbirinden
bağımsız şekilde aynı topic'e data iletiyor olabilir ve bunlar birbirinden bağımsız
**LSN** (PostgreSQL içindeki sıralama numarası) üretir. Ya da birden fazla CDC
ürünü aynı topic'e yazıyor olabilir.

Kafka, kaynağın ne olduğunu bilmez ve bilmek zorunda da değildir. Bu sebeple
kaynaktan gelen sıra numaralarına bağımlı kalmak yerine **kendi sıra numarasını**
üretir: offset. Tek bir kaynak olsa bile Kafka yine offset verir; çünkü offset,
Kafka'nın temel tasarımının bir parçasıdır. Birden fazla kaynak olması ise bunu
daha da zorunlu kılar.

### Offset ne işe yarar?

**Birincisi: sıralama.** Aynı partition içindeki mesajlar offset sırasıyla okunur.
Consumer, offset 5'teki mesajı offset 8'den önce okur.

**İkincisi: kaldığın yerden devam edebilme.** Consumer çöküp tekrar ayağa
kalktığında "en son offset 42'ye kadar okumuştum" der ve 43'ten devam eder. Offset
olmasaydı, consumer her seferinde en baştan okumak ya da hangi mesajları okuduğunu
kendisi bir yerde tutmak zorunda kalırdı.

### Offset anlamsal bir doğruluk sunmaz

Fakat offset **anlamsal bir doğruluk sunmaz**. Birden fazla bağımsız kaynak aynı
partition'a yazdığında Kafka sadece "bu mesaj bana önce ulaştı" diyerek düşük
offset verir; gerçekte hangi event'in önce oluştuğunu bilmez.

Anlamsal sıralama **kaynakta** korunur. Örneğin tek bir PostgreSQL'den CDC ile akan
event'ler, WAL'daki LSN sırasıyla Kafka'ya yazılır ve offset sırası anlamsal
sırayla örtüşür. Bu yüzden aynı entity'nin event'lerinin **tek bir kaynaktan**
gelmesi önemlidir.

Buradan kritik bir tasarım kuralı çıkar:

> Aynı entity'nin event'leri tek bir kaynaktan gelmelidir.

Eğer aynı siparişe ait event'ler iki farklı veritabanından, iki farklı CDC ile
Kafka'ya akıyorsa, offset sırası anlamsal sırayla örtüşmeyebilir ve consumer
tarafında tutarsızlıklara yol açabilir. Burada hata **veritabanı seviyesinde**
yapılmış olur. Kafka sadece gelen mesajları sırayla yazar; kaynağın doğru
tasarlanıp tasarlanmadığı Kafka'nın sorumluluğunda değildir.

## Retention: Kafka bir queue değildir

Son olarak Kafka **retention** konusuna değinelim. Kafka, mesajları yazdıktan sonra
silmez; varsayılan olarak **7 gün** diskinde tutar. Fakat bu 7 günü isterseniz 7
dakika, isterseniz 7 yıl yapabilirsiniz. Bu tamamen tabi olduğunuz regülasyonlar ve
disk boyutunuzla alakalıdır.

İşte tam da bu noktada Kafka'nın geleneksel bir **message queue** olmadığını
anlıyoruz:

- Bir queue'da mesaj, consumer tarafından okunduğu anda kuyruktan silinir. Bir kere
  okunur ve gider.
- Kafka'da ise mesaj okunduktan sonra silinmez; retention süresi dolana kadar
  diskinde kalmaya devam eder.

Bu sayede farklı consumer group'lar aynı mesajı **bağımsız olarak** okuyabilir; bir
consumer, offset'ini geri sararak geçmiş mesajları tekrar işleyebilir (replay).

> Kafka bir queue değil, **dağıtık bir commit log**'dur.
