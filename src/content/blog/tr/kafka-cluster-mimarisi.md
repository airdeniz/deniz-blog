---
title: 'Kafka Cluster''ının Anatomisi: Broker, Partition ve Replication'
description: 'Üç broker''lı bir cluster üzerinden Kafka''nın iç işleyişi: veri broker''lara nasıl dağılır, leader ve replica ne işe yarar, metadata''yı ZooKeeper''dan devralan KRaft neyi değiştirdi, CDC araçları kaynaktaki değişimi nasıl yakalar? (Kafka serisi — 1. yazı)'
pubDate: 2026-07-02
tags: ['Kafka', 'Cluster', 'CDC', 'Dağıtık Sistemler', 'Backend']
draft: false
---

**Apache Kafka**, sistemler arasında akan veriyi dağıtık ve dayanıklı biçimde
taşıyan bir olay akışı (event streaming) platformudur. En güçlü yanı şudur:
kaynakta üretilen veriyi anında toplar ve o veriyle ilgilenen onlarca farklı
servise, her birine diğerlerinden bağımsız olarak dağıtır.

Bu yazıda bir Kafka cluster'ının nasıl çalıştığını, **3 broker'lı** bir örnek
üzerinden adım adım ele alacağız. Başlamadan önce akılda tutulması gereken temel
eşitlik şu:

> **1 broker = 1 Kafka servisi.**

## Neden birden fazla broker'a ihtiyaç var?

Neden tek bir Kafka servisi yetmiyor da birden fazlasının paralel çalışması
gerekiyor? Çünkü tek bir servis, ihtiyaç duyulan I/O gücünü, ağ bant genişliğini,
RAM'i ve işlemci gücünü tek başına karşılayamayabilir. En güçlü makine bile
alınsa, günün sonunda **donanımsal limitlere** takılınır.

Bu yüzden birbirinden izole birden fazla broker çalıştırılır:

- Aynı Docker Compose içinde tanımlanmış, ayrı konteynerlerde çalışan broker'lar,
- Aynı makinede birbirinden tamamen izole birden fazla broker,
- Ayrı sunuculara dağıtılmış broker'lar.

Buradaki izolasyon **runtime düzeyindedir**; veri açısından broker'lar
birbirinden kopuk değildir. Lider seçimi ve metadata senkronizasyonu gibi
ihtiyaçlar nedeniyle sürekli iletişim halindedirler. Ayrılıktan kasıt şudur: her
broker **kendi CPU'sunda, kendi belleğinde** çalışır.

## Veri neden dağıtılır?

Asıl ihtiyaç, **veriyi dağıtma gücünü** elde etmektir. Peki veri neden dağıtılır?
Çünkü kaynakta üretilen verinin işlenmesi, işlenmeden önce de üretildiği yerden
alınıp başka servislere taşınması gerekir — böylece veriyi üreten yazılımlar
kendi asıl işlerine odaklanabilir.

Kafka tam bu noktada devreye girer. Bir sipariş sisteminde yeni bir sipariş
oluştuğunda, aynı event'i farklı **consumer group**'lar (bu kavrama birazdan
geleceğiz) okuyabilir:

- Biri ödeme servisine iletir,
- Biri kargo servisini tetikler,
- Biri müşteriye bildirim e-postası gönderir.

Hepsi aynı topic'ten, aynı event'ten veri alır ama **farklı işler** için
kullanır. Bir stok uyarı servisi düşünün: Kafka'dan beslenen bu servis, bir
ürünün stoku 10 adedin altına düştüğünde Slack ya da başka bir uygulama
üzerinden ilgili ekibe otomatik uyarı gönderebilir.

## Kafka, kaynaktaki değişiklikleri nasıl anlıyor?

Peki Kafka; üretim tarafında oluşan yeni bir siparişi, siparişin statü
değişikliğini ya da silindiğini nasıl haber alıyor? Burada devreye **CDC (Change
Data Capture)** araçları girer.

Bir şirketin bu noktada önünde üç yol vardır:

- Kendi CDC aracını geliştirmek,
- Açık kaynak bir CDC aracı kullanmak (örneğin **Debezium**),
- Bir vendor'den satın almak (örneğin **Oracle GoldenGate**).

CDC araçları, kaynak veritabanındaki her DML işlemini anında loglardan okur:

- PostgreSQL'de **WAL** (bunun için WAL log seviyesi `logical` olmalıdır),
- Oracle'da **redo log**.

Okuduğu veriyi de Kafka'ya aktarır. Update işlemlerinde bu veri hem **before**
hem **after** haliyle taşınır. Mantık şöyle işler:

| İşlem | before | after |
| --- | --- | --- |
| **INSERT** | — (sistemde önceki kayıt yok) | dolu |
| **UPDATE** | dolu | dolu |
| **DELETE** | dolu | — (satır silindiği için içerik yok) |

Yani sistemde daha önce var olmayan bir kayıt oluştuğunda before olamaz; o
offset'teki mesajda yalnızca after bulunur. Delete işleminde ise satır artık
olmadığı için yalnızca before dolu gelir.

CDC aracı bu takibi her tablodaki **unique bir kolon (key)** ya da kolon grubu
üzerinden yapar. Kaynak tarafında böyle bir tanım yoksa, tüm kolonları birlikte
unique'liği sağlıyormuş gibi ele alır — pek de istenmeyen bir durumdur.

Kafka'ya akan bu veri, ister Kafka UI aracından ister üçüncü parti araçlardan
(örneğin **Redpanda**) izlenebilir.

## Cluster içinde partition ve broker dağılımı

Şimdi cluster'a dönelim. Elimizde 3 broker olsun: **Broker1, Broker2, Broker3**.
`orders` adında bir topic oluşturulduğunu ve ona **3 partition** verildiğini
varsayalım: **P0, P1, P2**.

Burada kritik bir ayrım var: topic **mantıksal** bir kavramdır. Asıl bakılması
gereken yer **partition'lar ve broker'lardır**. Yükün dengeli dağıtıldığı bu
örnekte her broker'a 2 partition düşer:

```
Broker 1   →   P0 (leader)    P2 (replica)
Broker 2   →   P1 (leader)    P0 (replica)
Broker 3   →   P2 (leader)    P1 (replica)
```

### Leader ve replica nedir?

Peki bu şemadaki **leader** ve **replica** ne anlama geliyor?

- Bir partition bir broker'da **leader** konumundaysa, o partition'a yönelik
  yazma ve okuma işlemlerini o broker üstlenir.
- Bir partition bir broker'da **replica** modundaysa, buna **follower**
  partition da denir. Follower'lar kendi leader partition'larından sürekli veri
  çeker.

Bu çekme işlemi periyodik bir yenileme değil, neredeyse **gerçek zamanlı akan**
bir veri akışıdır. Bir süre vermek gerekirse, varsayılan ayarlarda **500 ms**'dir.

> Bir partition, birden fazla broker'da aynı anda lider olamaz.

### Replication factor

Bir partition'ın kaç replica'sı olacağını **replication factor** parametresi
belirler:

- **replication factor = 2** → 1 leader + 1 replica. (Yukarıdaki örnek buydu.)
- **replication factor = 3** → 1 leader + 2 replica.

Gerçek dünyada genellikle **replication factor = 3** baz alınır.

Bir broker'da birden fazla replica partition bulunabilir; Kafka buna bir sınır
koymaz. Sınırı tamamen broker'ın donanım kapasitesi çizer: disk, RAM, CPU ve ağ
bant genişliği.

## ZooKeeper'dan KRaft'a: metadata'yı kim yönetiyor?

Buraya kadar hep hangi partition'ın hangi broker'da olduğunu, kimin leader kimin
follower olduğunu konuştuk. Peki bu "harita" — yani metadata — nerede tutuluyor?
Kafka'nın son yıllarda en çok değişen tarafı tam olarak burası.

Eski mimaride Kafka bu metadata'yı (broker ve leader haritasını) kendi içinde
değil, dışarıdaki ayrı bir **ZooKeeper** kümesinde tutuyordu. Bunun birkaç
bedeli vardı:

- Metadata'dan sorumlu **controller** broker çöktüğünde, yeni controller tüm
  metadata'yı ZooKeeper'dan **sıfırdan** yüklemek zorundaydı. Büyük
  cluster'larda bu toparlanma dakikalar sürebiliyordu.
- Pratikte partition sayısı ~200 bin civarında bir tavana dayanıyordu.
- İki ayrı sistemin (Kafka + ZooKeeper) sürekli senkron kalması gerekiyordu; bu
  hem metadata tutarsızlığı riski hem de ekstra operasyonel yük demekti (ayrı
  kurulum, ayrı bakım).

**KRaft** ile bu dış bağımlılık tamamen ortadan kalktı. Metadata artık Kafka'nın
kendi içinde, **Raft konsensüs** algoritmasıyla yönetiliyor. Sonuç: controller
failover süresi saniyenin altına indi, partition tavanı fiilen kalktı ve
yönetilmesi gereken ikinci bir sistem kalmadı.

### Neden controller sayısı hep tek verilir?

ZooKeeper da KRaft da ortak bir mekanizmayla çalışır: **quorum (çoğunluk)**. Bu
koordinasyon katmanının karar alabilmesi (örneğin yeni bir controller
seçebilmesi) için node'ların **yarısından fazlasının** ayakta olması gerekir.
Tolere edilebilen çökme sayısını basit bir formül verir:

> tolere edilen çökme = (N − 1) / 2

Tek ve çift sayıları yan yana koyunca çift sayının neden anlamsız olduğu
netleşir:

| Node sayısı | Çoğunluk için gereken | Tolere edilen çökme |
| --- | --- | --- |
| **3** (tek) | 2 | 1 |
| **4** (çift) | 3 | 1 |
| **5** (tek) | 3 | 2 |

Dikkat edilirse **4 node, 3 node'a kıyasla hiçbir ek dayanıklılık
kazandırmıyor**; ikisi de yalnızca 1 çökmeyi tolere ediyor. Dördüncü node
yalnızca maliyeti ve senkronizasyon yükünü artırıyor. Üstelik çift sayı,
cluster ikiye bölündüğünde (network partition) her iki yarının 2'şer node ile
kaldığı ve hiçbirinin çoğunluğu sağlayamadığı **split-brain** riskini büyütür.
Bu yüzden koordinasyon katmanına hep **3, 5, 7** gibi tek sayılar verilir.

Şunu da ayırt etmek gerekir: bu "tek sayı" kuralı **controller/quorum** katmanı
içindir. Asıl veriyi tutan **broker** sayısı çift de olabilir (4, 6, 8); orada
belirleyici olan quorum değil, replication factor'ü rahat dağıtabilmek ve yükü
dengelemektir. Yine de üretim ortamının minimum kurulumu `replication factor = 3`
için en az 3 broker gerektirdiğinden, pratikte broker tarafında da çoğunlukla
tek sayıyla (en az 3) başlanır ve sektörde genel bir "tek sayı" alışkanlığı
yerleşmiştir.

## Consumer group

Consumer group'tan kasıt, **aynı topic'i okuyan ama farklı işler yapan servis
gruplarıdır**. Bir servis Kafka'dan gelen veriyi raporlama akışına
yönlendirirken, bir diğeri aynı veriyle e-posta gönderebilir.

## Bir topic aslında birden fazla broker'dan okunur

Şimdi baştan beri anlattığımız iki parçayı birleştirebiliriz, çünkü birlikte
düşünüldüğünde resim tamamlanıyor: partition dağılımı + consumer group. Bir
topic oluşturulduğunda partition'ları broker'lara dağıtılır; her partition'ın
bir broker'da leader'ı, başka broker'larda follower replica'ları olur. Yani tek
bir topic fiziksel olarak **birden fazla broker'ın diskine bölünerek** yazılır —
topic'i tek bir yerde duran bir dosya gibi düşünmemek gerekir.

Peki consumer bu dağınık yapıyı nasıl okuyor? Consumer bağlanırken tek bir
broker adresi değil, bir **bootstrap servers** listesi verir. Bu liste üzerinden
Kafka'ya bağlanır, "hangi partition hangi broker'da?" haritasını (metadata)
alır ve doğrudan ilgili broker'lara gider.

İşin en verimli tarafı şu: aynı `group.id`'ye sahip birden fazla consumer,
partition'ları aralarında paylaşır. Consumer 1, Broker 1'deki Partition 0'ı
okurken Consumer 2, Broker 2'deki Partition 1'i okur. Böylece tek bir topic,
aynı anda birden fazla broker'dan **paralel** olarak okunmuş olur. Bir broker
çökerse follower'lar o partition'ların liderliğini devralır ve okuma kesintisiz
sürer.

---

Buraya kadar cluster'ın nasıl kurulduğunu, verinin broker'lara nasıl
dağıtıldığını ve nasıl okunduğunu ele aldık. Peki tek bir mesaj seviyesine
inildiğinde işler nasıl yürüyor — bir mesaj hangi partition'a düşer, offset ne
işe yarar, sıralama garantisi nereye kadar geçerlidir? Bunlar serinin ikinci
yazısının konusu:
**[Kafka'da Partition, Offset ve Sıralama Garantileri »](/blog/kafka-partition-offset-siralama/)**
