---
title: 'Bir Kafka Cluster''ı Nasıl Çalışır?'
description: 'Bir Kafka cluster mimarisini; broker, partition, leader/replica, replication, KRaft, CDC ile veri akışı ve consumer group kavramları üzerinden kendi anlatımımla ele alıyorum. (Kafka serisi — 1. yazı)'
pubDate: 2026-07-02
tags: ['Kafka', 'Cluster', 'CDC', 'Dağıtık Sistemler', 'Backend']
draft: false
---

**Apache Kafka**, sistemler arasında akan veriyi dağıtık ve dayanıklı bir şekilde
taşıyan bir olay akışı (event streaming) platformudur. En güçlü yanı, kaynakta
üretilen veriyi anında toplayıp o veriyle ilgilenen onlarca farklı servise
birbirinden bağımsız biçimde dağıtabilmesidir.

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
**partition'lar ve broker'lardır**. Yükün dengeli dağıtıldığı bu senaryoda — yani
bizim örneğimizde — her broker'da 2 partition bulunur:

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

## ZooKeeper'dan KRaft'a: metadata'yı kim yönetiyor?

Buraya kadar hep partition'ların hangi broker'da olduğundan, kimin leader kimin
follower olduğundan bahsettik. Peki bütün bu "harita" — yani metadata — nerede
tutuluyor? Kafka'nın son yıllarda en çok değişen tarafı tam olarak burası.

Eski mimaride Kafka bu metadata'yı (broker ve leader haritasını) kendi içinde
değil, dışarıdaki ayrı bir **ZooKeeper** kümesinde tutuyordu. Bunun birkaç
sıkıntısı vardı:

- Metadata'dan sorumlu olan **controller** broker çöktüğünde, yeni controller tüm
  metadata'yı ZooKeeper'dan **sıfırdan** yüklemek zorunda kalıyordu. Büyük
  cluster'larda bu toparlanma dakikalar sürebiliyordu.
- Pratikte partition sayısı ~200 bin civarında bir tavana çarpıyordu.
- İki ayrı sistemin (Kafka + ZooKeeper) sürekli senkron kalması gerekiyordu; bu
  hem metadata tutarsızlığı riski hem de ekstra operasyonel yük demekti (ayrı
  kurulum, ayrı bakım).

**KRaft** ile bu dışarıya olan bağımlılık tamamen ortadan kalktı. Artık metadata,
Kafka'nın kendi içinde **Raft konsensüs** algoritmasıyla yönetiliyor. Sonuçta
controller failover saniyenin altına indi, partition sınırı fiilen ortadan kalktı
ve yönetilmesi gereken ayrı bir sistem kalmadı.

## Consumer group

Consumer group'a gelecek olursak; burada kastedilen şey, **aynı topic'i okuyan
ama farklı işler yapan servis gruplarıdır**. Bir servis Kafka'dan gelen datayı
raporlama akışına yönlendirirken, bir diğer servis aynı data ile bir e-mail
gönderebilir.

## Bir topic aslında birden fazla broker'dan okunur

Şimdi baştan beri anlattığımız iki şeyi birleştirelim, çünkü kafada güzel oturuyor:
partition dağılımı + consumer group. Bir topic oluşturulduğunda partition'ları
broker'lara dağıtılır demiştik; her partition'ın bir broker'da leader'ı, başka
broker'larda da follower replikaları oluyor. Yani tek bir topic fiziksel olarak
**birden fazla broker'ın diskine bölünerek** yazılır — topic'i tek bir yerde duran
bir dosya gibi düşünmemek lazım.

Peki consumer bu dağınık yapıyı nasıl okuyor? Consumer bağlanırken tek bir broker
adresi değil, bir **bootstrap servers** listesi verir. Bu liste üzerinden Kafka'ya
bağlanıp "hangi partition hangi broker'da?" haritasını (metadata) alır ve doğrudan
ilgili broker'lara gider.

İşin güzel tarafı şu: aynı `group.id`'ye sahip birden fazla consumer, partition'ları
aralarında paylaşır. Diyelim Consumer 1, Broker 1'deki Partition 0'ı okurken;
Consumer 2, Broker 2'deki Partition 1'i okuyor. Böylece tek bir topic, aynı anda
birden fazla broker'dan **paralel** olarak okunmuş olur. Bir broker çökerse de
follower'lar o partition'ların liderliğini devralır ve okuma kesintisiz devam eder.

---

Buraya kadar cluster'ın nasıl kurulduğunu, verinin broker'lara nasıl dağıtıldığını
ve nasıl okunduğunu gördük. Peki tek bir mesaj seviyesine indiğimizde işler nasıl
yürüyor — bir mesaj hangi partition'a düşer, offset ne işe yarar, sıralama garantisi
nereye kadar geçerli? Bunları serinin ikinci yazısında ele alıyorum:
**[Kafka'da Partition, Offset ve Sıralama Garantileri »](/blog/kafka-partition-offset-siralama/)**
