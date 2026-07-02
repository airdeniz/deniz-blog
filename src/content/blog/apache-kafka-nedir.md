---
title: 'Apache Kafka Nedir? Sıfırdan Temel Kavramlar'
description: 'Apache Kafka''nın ne işe yaradığını, neden var olduğunu ve topic, partition, offset, producer, consumer gibi temel kavramları örneklerle anlatan bir giriş.'
pubDate: 2026-07-02
tags: ['Kafka', 'Dağıtık Sistemler', 'Event-Driven', 'Backend']
draft: false
---

Modern sistemlerde veri artık tek bir yerde durmuyor: bir uygulamada üretilen
bilgi, aynı anda onlarca farklı servisin ilgi alanına girebiliyor. Bir kullanıcı
sipariş verdiğinde; stok servisi, ödeme servisi, e-posta servisi, analitik ekibi
ve dolandırıcılık tespiti sisteminin hepsi bu olaydan haberdar olmak ister.
İşte **Apache Kafka** tam olarak bu problemi çözmek için var.

Bu yazıda Kafka'yı sıfırdan, hiç bilmeyen birine anlatır gibi ele alacağım.

## Kafka tam olarak nedir?

En kısa tanımıyla Kafka, **dağıtık bir olay akışı (event streaming) platformudur**.
Biraz daha somutlaştıralım: Kafka'yı, uygulamaların birbirine mesaj gönderdiği
devasa, dayanıklı ve sıraya dizili bir **kayıt defteri (log)** gibi düşünebilirsin.

Klasik yaklaşımda servisler birbirini doğrudan çağırır:

```
Sipariş Servisi ──> Stok Servisi
                ──> Ödeme Servisi
                ──> E-posta Servisi
```

Bu yaklaşımın sorunu şu: her yeni servis eklendiğinde, sipariş servisinin
kodunu değiştirmen gerekir. Servisler birbirine sıkı sıkıya bağlıdır (tight coupling).
Ödeme servisi çökerse sipariş akışı da etkilenebilir.

Kafka araya girer ve bu bağı çözer:

```
Sipariş Servisi ──> [ Kafka: "siparisler" topic'i ] ──> Stok Servisi
                                                     ──> Ödeme Servisi
                                                     ──> E-posta Servisi
                                                     ──> Analitik
```

Artık sipariş servisi kimin dinlediğini bilmez, umursamaz. Sadece "bir sipariş
oluştu" olayını Kafka'ya yazar. Yeni bir servis eklemek istediğinde, o servis
gelir Kafka'dan okumaya başlar — kaynak servise hiç dokunmadan.

## Neden sadece bir mesaj kuyruğu değil?

"Bu RabbitMQ gibi bir mesaj kuyruğu mu?" diye sorabilirsin. Benzer ama önemli bir
fark var: geleneksel kuyruklarda bir mesaj okunduğunda genelde **tüketilir ve silinir**.
Kafka'da ise mesajlar okunduktan sonra **kaybolmaz**; belirlenen süre boyunca
(örneğin 7 gün, ya da sonsuza kadar) diskte kalır.

Bunun getirdiği güç şu:

- Aynı veriyi **birden fazla tüketici** birbirinden bağımsız okuyabilir.
- Bir tüketici çökerse, ayağa kalktığında **kaldığı yerden** devam edebilir.
- Yeni bir servis, **geçmişe dönük** tüm olayları baştan okuyabilir (replay).

Bu yüzden Kafka'ya sadece "kuyruk" değil, "dağıtık, kalıcı bir olay logu" denir.

## Temel Kavramlar

Kafka'yı anlamanın anahtarı birkaç temel kavramı oturtmaktan geçer.

### Topic (Konu)

**Topic**, mesajların yazıldığı isimlendirilmiş bir kategoridir. Bir veritabanındaki
tabloya benzetebilirsin. Örneğin `siparisler`, `kullanici-kayitlari`, `odeme-loglari`
birer topic olabilir. Üreticiler bir topic'e yazar, tüketiciler bir topic'ten okur.

### Partition (Bölüm)

Bir topic, tek bir dosya değildir; performans ve ölçeklenebilirlik için
**partition** adı verilen parçalara bölünür. Her partition, sona doğru büyüyen
sıralı bir mesaj dizisidir:

```
"siparisler" topic'i

Partition 0:  [msg0][msg1][msg2][msg3] ->
Partition 1:  [msg0][msg1][msg2] ->
Partition 2:  [msg0][msg1][msg2][msg3][msg4] ->
```

Partition'lar Kafka'nın ölçeklenmesini sağlar: bir topic 12 partition'a bölünmüşse,
o topic'i 12 tüketici paralel olarak okuyabilir. Ne kadar çok partition, o kadar
çok paralellik.

> **Sıralama garantisi:** Kafka, mesaj sırasını yalnızca **tek bir partition içinde**
> garanti eder — topic'in tamamında değil. Bu yüzden sırası önemli olan mesajları
> (örneğin aynı kullanıcının işlemlerini) aynı partition'a düşürmek gerekir.

### Offset

Bir partition içindeki her mesajın, 0'dan başlayıp artan benzersiz bir sıra numarası
vardır: buna **offset** denir. Offset, "bu partition'da nerede kaldım?" sorusunun
cevabıdır. Her tüketici, hangi offset'e kadar okuduğunu takip eder. Kafka mesajı
silmez, sadece tüketici "işaretçisini" ileri taşır.

```
Partition 0:  [msg0][msg1][msg2][msg3][msg4]
offset:          0     1     2     3     4
                             ^
                    tüketici burada (offset 2'ye kadar okudu)
```

### Producer (Üretici)

**Producer**, Kafka'ya mesaj yazan uygulamadır. Bir mesaj gönderirken hangi topic'e
yazacağını belirtir. İsteğe bağlı olarak bir **key** (anahtar) verebilir; Kafka bu
anahtara göre mesajın hangi partition'a gideceğine karar verir. Aynı anahtara sahip
tüm mesajlar aynı partition'a düşer — bu da sıralamayı korumanın yoludur.

### Consumer (Tüketici) ve Consumer Group

**Consumer**, bir topic'ten mesaj okuyan uygulamadır. Kafka'nın en zarif
mekanizmalarından biri **consumer group**'tur.

Aynı gruba ait tüketiciler, bir topic'in partition'larını **aralarında paylaşır**.
Böylece iş yükü otomatik dağıtılır:

```
"siparisler" topic'i (3 partition)   "siparis-isleyiciler" grubu

Partition 0  ─────────────────────>  Consumer A
Partition 1  ─────────────────────>  Consumer B
Partition 2  ─────────────────────>  Consumer C
```

Consumer C çökerse, Kafka onun partition'ını otomatik olarak A veya B'ye devreder
(buna **rebalancing** denir). Yeni bir tüketici eklersen yük yeniden dağılır.

Farklı consumer group'lar ise **aynı veriyi bağımsız okur**. Yani `analitik` grubu
ile `e-posta` grubu, `siparisler` topic'indeki her mesajı ayrı ayrı alır — biri
diğerinin okuduğunu tüketmez.

### Broker ve Cluster

**Broker**, Kafka sunucusunun kendisidir; partition'ları diskte tutan ve
istekleri karşılayan süreçtir. Üretim ortamında genellikle birden fazla broker
bir arada çalışır ve bir **cluster** (küme) oluşturur.

Dayanıklılık için her partition birden fazla broker'a kopyalanır (**replication**).
Her partition'ın bir **leader** kopyası ve birkaç **follower** kopyası olur.
Leader broker çökerse, follower'lardan biri otomatik olarak leader'a terfi eder
ve sistem çalışmaya devam eder. Veri kaybı yaşanmaz.

## Hepsini birleştirelim

Kavramların hepsini bir araya getiren tam resim şöyle:

```
   PRODUCER'LAR                    KAFKA CLUSTER                    CONSUMER'LAR
                          ┌───────────────────────────┐
 Sipariş Servisi ───────> │  Broker 1   Broker 2      │ ──> [analitik grubu]
                          │                           │
 Ödeme Servisi  ───────> │  "siparisler" topic       │ ──> [e-posta grubu]
                          │   ├─ Partition 0 (leader) │
                          │   ├─ Partition 1 (leader) │ ──> [stok grubu]
                          │   └─ Partition 2 (leader) │
                          │   + follower kopyalar     │
                          └───────────────────────────┘
```

Producer'lar yazar, cluster veriyi partition'lara bölerek dayanıklı biçimde saklar,
consumer group'lar bağımsız olarak okur.

## Küçük bir kod örneği

Kafka'nın Java, Python, Go, Node.js gibi birçok dilde istemcisi var. İşte
Python (`kafka-python`) ile basit bir üretici ve tüketici:

```python
# Producer — bir mesaj yaz
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers="localhost:9092",
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)

producer.send(
    "siparisler",
    key=b"kullanici-42",              # aynı kullanıcı -> aynı partition
    value={"urun": "kitap", "adet": 2},
)
producer.flush()
```

```python
# Consumer — mesajları oku
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    "siparisler",
    bootstrap_servers="localhost:9092",
    group_id="siparis-isleyiciler",   # consumer group
    auto_offset_reset="earliest",     # baştan oku
    value_deserializer=lambda v: json.loads(v.decode("utf-8")),
)

for message in consumer:
    print(f"partition={message.partition} offset={message.offset}")
    print(f"sipariş: {message.value}")
```

## Kafka ne zaman kullanılır?

Kafka'nın parladığı tipik senaryolar:

- **Mikroservisler arası iletişim** — servisleri olaylar üzerinden gevşek bağlamak.
- **Log ve metrik toplama** — binlerce sunucudan gelen veriyi merkezî toplamak.
- **Gerçek zamanlı veri işleme (stream processing)** — anlık analitik, öneri, uyarı.
- **Event sourcing** — sistemin durumunu, olayların değişmez bir logu olarak tutmak.
- **Veri entegrasyonu** — veritabanları, veri ambarları ve sistemler arası köprü.

## Ne zaman kullanılmamalı?

Kafka güçlüdür ama her problem için doğru araç değildir:

- **Küçük ve basit uygulamalar** için fazla ağır kaçabilir; işletmesi ciddi bir yük.
- **İstek/yanıt (request/response)** tarzı senkron iletişim için tasarlanmadı; bunun
  için REST veya gRPC daha uygun.
- **Düşük hacimli, basit görev kuyrukları** için RabbitMQ gibi araçlar daha pratik olabilir.

## Özet

Toparlarsak, aklında kalması gereken çerçeve şu:

| Kavram | Ne işe yarar |
| --- | --- |
| **Topic** | Mesajların yazıldığı isimli kategori |
| **Partition** | Topic'in ölçeklenebilir, sıralı parçası |
| **Offset** | Partition içindeki mesajın sıra numarası |
| **Producer** | Kafka'ya mesaj yazan uygulama |
| **Consumer** | Kafka'dan mesaj okuyan uygulama |
| **Consumer Group** | Yükü paylaşan tüketici topluluğu |
| **Broker / Cluster** | Veriyi saklayan sunucular |

Kafka'nın özü aslında sade bir fikir üzerine kurulu: **değişmez, sıralı, dağıtık
bir log**. Bu basit fikrin üzerine inşa edilen partition, replication ve consumer
group mekanizmaları, onu modern veri altyapılarının belkemiği hâline getiriyor.

Bir sonraki yazıda partition stratejilerine ve mesaj teslim garantilerine
(at-least-once, exactly-once) daha derin gireceğim. Takipte kal!
