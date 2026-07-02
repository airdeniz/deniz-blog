---
title: 'Kafka''da Partition, Offset ve Sıralama Garantileri'
description: 'Kafka serisinin ikinci yazısı: bir mesaj hangi partition''a yazılır (hash), partition sayısı ve hot key riski, offset''in rolü, sıralama garantileri ve retention — Kafka neden bir queue değil de commit log?'
pubDate: 2026-07-03
tags: ['Kafka', 'Partition', 'Offset', 'Dağıtık Sistemler', 'Backend']
draft: false
---

Bu yazı, Kafka serisinin ikinci parçası. İlk yazıda bir Kafka cluster'ının nasıl
kurulduğunu; broker'ları, partition dağılımını, replikasyonu, CDC ile veri girişini
ve consumer group'ları konuşmuştuk
([buradan okuyabilirsin](/blog/kafka-cluster-mimarisi/)). Şimdi bir tık aşağı inip
**tek bir mesaj seviyesine** bakıyoruz: bir mesaj hangi partition'a yazılır, offset
ne işe yarar ve Kafka sıralama konusunda tam olarak neyi garanti eder?

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
**sıralı** kalır. Bu sıra kritiktir; çünkü aynı siparişin "oluşturuldu → statü
değişti → silindi" event'leri yanlış sırayla işlenirse, consumer tarafında
tutarsız bir sonuç ortaya çıkar.

### Partition sayısını en baştan doğru seçin

Fakat bu partition sayısı, sistem kurulurken çok iyi tespit edilmelidir. İhtiyaç 3
ise, gelecekte daha fazla kapasite gerekebileceğinden en az **12 veya 24**
partition seçilmelidir.

Sebep: partition sayısını artırmak (ki mevcut bir topic'te partition sayısı
yalnızca **artırılabilir**; azaltmak için topic'i silip yeniden oluşturmak
gerekir), hash mekanizmasının farklı sonuçlar üretmesine sebep olur. Çünkü partition sayısının
hesaplamadaki rolü kritiktir. Eğer hesaplama değişirse, bu sefer `order_id = 5`
siparişi P1'e gitmez ve belki de P2'ye düşer.

Ve Kafka **sıralama garantisini sadece aynı partition içinde** verir. Aynı
siparişin event'leri iki farklı partition'a dağılırsa, sıra (offset) karışabilir.

### Dikkat: hot key ve data skew

Entity ID'yi (bizim örneğimizde `order_id`) partition key yapmak, sıralama
açısından doğru tasarım. Ama burada gözden kaçan bir risk var: eğer bir entity
diğerlerinden **kat kat fazla** event üretiyorsa, o key'in düştüğü partition ve
dolayısıyla o partition'ın leader'ı olan broker aşırı yüklenir. Buna **data skew**
ya da **hot key** problemi deniyor.

Somut bir örnek: normal bir sipariş 300 kayıt üretirken, kurumsal dev bir sipariş
milyonlarca kayıt üretiyorsa, o siparişin key'i tek bir partition'ı tıka basa
doldururken diğer partition'lar neredeyse boş bekler. Yük dengesiz dağılır.

Böyle durumlarda, sıralama ihtiyacını da gözeterek **bileşik bir key** (örneğin
`siparis_no + statü grubu`) kullanıp yükü biraz daha dağıtabilirsiniz.

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

## Kafka'dan hedefe nasıl yazılır? Connect mi, Flink/Spark mı?

Peki bu veriyi Kafka'dan alıp nihai bir hedefe — örneğin bir **Iceberg** tablosuna
ya da **BigQuery**'ye — yazmak istediğimizde ne kullanırız?

Yaygın bir yanılgı, arada mutlaka bir **Flink** ya da **Spark** olması gerektiğini
sanmak. Oysa şart değil. **Kafka Connect** (daha doğrusu bir **Sink Connector**),
veriyi tek satır kod yazmadan, sadece konfigürasyonla doğrudan hedefe taşıyabilir.

Ayrım noktası **transformation ihtiyacı**:

- Veri yolda değişmeden, olduğu gibi düz taşınacaksa → **Kafka Connect** yeterli ve
  çok daha hafif.
- Yolda aggregation, stream-stream join ya da pencereleme (windowing) gibi ağır bir
  dönüşüm gerekiyorsa → burada **Flink** veya **Spark Structured Streaming** devreye girer.

Yani kendinize sormanız gereken tek soru şu: *"Veriyi hedefe yazmadan önce yolda
ağır bir dönüşüme sokmam gerekiyor mu?"* Cevap **hayır**sa Kafka Connect, **evet**se
Flink/Spark.

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
