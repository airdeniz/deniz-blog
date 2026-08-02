---
title: 'Kafka''da Bir Mesajın Adresi: Partition, Offset ve Sıralama Garantileri'
description: 'Kafka serisinin ikinci yazısı: bir mesajın hangi partition''a düşeceğini belirleyen hash mekanizması, partition sayısını baştan doğru seçmenin önemi, hot key riski, offset''in gerçekte neyi garanti edip neyi etmediği ve retention — Kafka neden bir queue değil, dağıtık bir commit log?'
pubDate: 2026-07-03
tags: ['Kafka', 'Partition', 'Offset', 'Dağıtık Sistemler', 'Backend']
draft: false
---

Bu yazı, Kafka serisinin ikinci parçası. İlk yazıda bir Kafka cluster'ının nasıl
kurulduğunu; broker'ları, partition dağılımını, replikasyonu, CDC ile veri girişini
ve consumer group'ları ele almıştık
([ilk yazıya buradan ulaşabilirsiniz](/blog/kafka-cluster-mimarisi/)). Şimdi bir
seviye aşağı inip **tek bir mesaja** odaklanıyoruz: bir mesaj hangi partition'a
yazılır, offset ne işe yarar ve Kafka sıralama konusunda tam olarak neyi garanti
eder?

## Bir mesaj hangi partition'a yazılır?

Kafka'da bir mesajın hangi partition'a yazılacağını **hash mekanizması** belirler.
Hash, burada belirli bir dizi matematiksel işlemi ifade ediyor. Önemli olan sonuç
şu: bir **key** (bu örnekte `order_id`) her zaman tek bir partition'a yazılır.

`order` tablosunda key `order_id` ise, `order_id = 5` olan sipariş her seferinde
aynı partition'a düşer. Hedef partition şu formülle bulunur:

```
hedef partition = hash(key) % partition_sayısı
```

Örneğin 3 partition var (P0, P1, P2) ve key olarak `order_id` kullanılıyor:

```
order_id = 5   →  hash(5)  = 7634  →  7634 % 3 = 1  →  P1
order_id = 12  →  hash(12) = 4821  →  4821 % 3 = 0  →  P0
order_id = 5   →  hash(5)  = 7634  →  7634 % 3 = 1  →  P1 (yine)
```

Aynı girdi her zaman aynı çıktıyı üretir; bu yüzden `order_id = 5` her seferinde
P1'e düşer. Sonuç olarak aynı siparişe ait tüm event'ler tek partition'da **sıralı**
kalır. Bu sıra kritiktir: aynı siparişin "oluşturuldu → statü değişti → silindi"
event'leri yanlış sırayla işlenirse, consumer tarafında tutarsız bir tablo ortaya
çıkar.

### Partition sayısı en baştan doğru seçilmeli

Partition sayısına sistem kurulurken dikkatle karar vermek gerekir. Bugünkü ihtiyaç
3 partition ise, ileride kapasite gerekebileceğini hesaba katıp en az **12 veya 24**
partition ile başlamak daha doğrudur.

Sebebi şu: mevcut bir topic'te partition sayısı yalnızca **artırılabilir** —
azaltmak için topic'i silip yeniden oluşturmak gerekir — ve sayıyı artırmak, hash
hesabının farklı sonuçlar üretmesine yol açar. Partition sayısı formülün doğrudan
bir parçası olduğu için, sayı değiştiğinde `order_id = 5` artık P1'e değil belki de
P2'ye düşer.

Kafka ise **sıralama garantisini yalnızca aynı partition içinde** verir. Aynı
siparişin event'leri iki farklı partition'a dağılırsa, sıra (offset) karışabilir.

### Dikkat: hot key ve data skew

Entity ID'yi (bu örnekte `order_id`) partition key yapmak, sıralama açısından doğru
tasarımdır. Ama gözden kaçması kolay bir risk taşır: bir entity diğerlerinden
**kat kat fazla** event üretiyorsa, o key'in düştüğü partition — ve dolayısıyla o
partition'ın leader'ı olan broker — aşırı yüklenir. Bunun adı **data skew** ya da
**hot key** problemidir.

Somut bir örnek: normal bir sipariş 300 kayıt üretirken kurumsal dev bir sipariş
milyonlarca kayıt üretiyorsa, o siparişin key'i tek bir partition'ı doldurur,
diğer partition'lar ise neredeyse boş bekler. Yük dengesiz dağılmış olur.

Böyle durumlarda, sıralama ihtiyacını da gözeterek **bileşik bir key** (örneğin
`siparis_no + statü grubu`) kullanmak yükü biraz daha dengeli dağıtabilir.

## Offset

Bir partition'a yazılan her mesaj, sıralı bir **offset** numarası alır: 0, 1, 2, 3…
Consumer bir partition'ı okurken mesajları bu offset sırasıyla okur.

Burada bilinmesi gereken önemli bir nokta daha var: tek bir Kafka topic'i
**birden fazla kaynaktan** beslenebilir. Örneğin iki farklı PostgreSQL, birbirinden
bağımsız şekilde aynı topic'e veri gönderiyor olabilir ve her biri kendi bağımsız
**LSN**'ini (PostgreSQL'in içindeki sıralama numarası) üretir. Ya da birden fazla
CDC ürünü aynı topic'e yazıyor olabilir.

Kafka, kaynağın ne olduğunu bilmez ve bilmek zorunda da değildir. Bu yüzden
kaynaktan gelen sıra numaralarına bağımlı kalmak yerine **kendi sıra numarasını**
üretir: offset. Kaynak tek olsa bile Kafka yine offset verir, çünkü offset
Kafka'nın temel tasarımının bir parçasıdır. Birden fazla kaynak olması bunu yalnızca
daha da zorunlu kılar.

### Offset ne işe yarar?

**Birincisi: sıralama.** Aynı partition içindeki mesajlar offset sırasıyla okunur.
Consumer, offset 5'teki mesajı offset 8'dekinden önce okur.

**İkincisi: kalınan yerden devam edebilme.** Consumer çöküp yeniden ayağa
kalktığında "en son offset 42'ye kadar okumuştum" der ve 43'ten devam eder. Offset
olmasaydı consumer ya her seferinde en baştan okumak ya da hangi mesajları
okuduğunu kendi başına bir yerde tutmak zorunda kalırdı.

### Offset anlamsal bir doğruluk sunmaz

Öte yandan offset, **anlamsal bir doğruluk sunmaz**. Birden fazla bağımsız kaynak
aynı partition'a yazdığında Kafka yalnızca "bu mesaj bana önce ulaştı" diyerek
düşük offset'i verir; gerçekte hangi event'in önce oluştuğunu bilmez.

Anlamsal sıralama **kaynakta** korunur. Örneğin tek bir PostgreSQL'den CDC ile akan
event'ler, WAL'daki LSN sırasıyla Kafka'ya yazılır ve offset sırası anlamsal
sırayla örtüşür. Aynı entity'nin event'lerinin **tek bir kaynaktan** gelmesinin
önemi de buradan geliyor.

Buradan kritik bir tasarım kuralı çıkar:

> Aynı entity'nin event'leri tek bir kaynaktan gelmelidir.

Aynı siparişe ait event'ler iki farklı veritabanından, iki farklı CDC ile Kafka'ya
akıyorsa, offset sırası anlamsal sırayla örtüşmeyebilir ve consumer tarafında
tutarsızlıklara yol açabilir. Bu durumda hata **veritabanı seviyesinde** yapılmış
demektir. Kafka gelen mesajları yalnızca sırayla yazar; kaynağın doğru tasarlanıp
tasarlanmadığı Kafka'nın sorumluluğunda değildir.

## Kafka'dan hedefe nasıl yazılır? Connect mi, Flink/Spark mı?

Peki bu veriyi Kafka'dan alıp nihai bir hedefe — örneğin bir **Iceberg** tablosuna
ya da **BigQuery**'ye — yazmak gerektiğinde ne kullanılır?

Yaygın bir yanılgı, arada mutlaka bir **Flink** ya da **Spark** olması gerektiğini
düşünmektir. Oysa şart değil. **Kafka Connect** (daha doğrusu bir **Sink
Connector**), veriyi tek satır kod yazmadan, yalnızca konfigürasyonla doğrudan
hedefe taşıyabilir.

Ayrım noktası **transformation ihtiyacıdır**:

- Veri yolda değişmeden, olduğu gibi taşınacaksa → **Kafka Connect** yeterli ve
  çok daha hafiftir.
- Yolda aggregation, stream-stream join ya da pencereleme (windowing) gibi ağır bir
  dönüşüm gerekiyorsa → devreye **Flink** veya **Spark Structured Streaming**
  girer. İkisi arasındaki temel fark şu: Flink, her olayı tek tek işleyen
  (event-at-a-time) native bir stream motoru olduğu için milisaniye seviyesinde
  düşük gecikme sunar; Spark Structured Streaming ise olayları küçük gruplar
  halinde işlediğinden (micro-batch) gecikmesi biraz daha yüksektir ama batch
  ekosistemiyle entegrasyonu daha kolaydır.

Yani sorulması gereken tek soru şu: *"Veriyi hedefe yazmadan önce yolda ağır bir
dönüşüme sokmak gerekiyor mu?"* Cevap **hayır**sa Kafka Connect, **evet**se
Flink/Spark.

## Retention: Kafka bir queue değildir

Son olarak Kafka'nın **retention** davranışına bakalım. Kafka, mesajları yazdıktan
sonra silmez; varsayılan olarak **7 gün** diskinde tutar. Bu süre istenirse 7
dakikaya da indirilebilir, 7 yıla da çıkarılabilir — karar tamamen tabi olunan
regülasyonlara ve disk kapasitesine bağlıdır.

Kafka'nın geleneksel bir **message queue** olmadığı tam bu noktada ortaya çıkar:

- Bir queue'da mesaj, consumer tarafından okunduğu anda kuyruktan silinir. Bir kez
  okunur ve gider.
- Kafka'da ise mesaj okunduktan sonra silinmez; retention süresi dolana kadar
  diskte kalmaya devam eder.

Bu sayede farklı consumer group'lar aynı mesajı **bağımsız olarak** okuyabilir; bir
consumer, offset'ini geri sararak geçmiş mesajları yeniden işleyebilir (replay).

> Kafka bir queue değil, **dağıtık bir commit log**'dur.
