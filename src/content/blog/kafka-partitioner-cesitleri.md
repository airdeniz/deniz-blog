---
title: 'Kafka Partitioner Nedir? Partitioning Çeşitleri ve Gerçek Dünya Kullanımı'
description: 'Kafka serisinin üçüncü yazısı: bir mesajın hangi partition''a gideceğine karar veren partitioner nedir? Hash-based, round-robin, sticky ve custom partitioner''ları; sıralama garantisi trade-off''unu ve bunların gerçek dünyada hangi oranlarda kullanıldığını konuşuyoruz.'
pubDate: 2026-07-03
tags: ['Kafka', 'Partition', 'Partitioner', 'Dağıtık Sistemler', 'Backend']
draft: false
---

Bu yazı, Kafka serisinin üçüncü parçası. İlk yazıda bir cluster'ın nasıl
kurulduğunu ([buradan okuyabilirsin](/blog/kafka-cluster-mimarisi/)); ikinci yazıda
ise bir mesajın hangi partition'a yazıldığını, offset'in rolünü ve sıralama
garantilerini konuşmuştuk
([buradan okuyabilirsin](/blog/kafka-partition-offset-siralama/)). İkinci yazıda şunu
söylemiştik: bir mesaj, `hash(key) % partition_sayısı` ile bir partition'a düşer.

Peki bu kararı kim veriyor? Ve daha önemlisi: bu davranışı değiştirebilir miyiz?
Örneğin "hash kullanma, mesajları sırayla partition'lara dağıt" diyebilir miyiz?

Cevap: evet. Bu kararı veren mekanizmaya **partitioner** denir ve birden fazla çeşidi
vardır. Ama —bu yazının asıl amacı da bu— her seçim bir şeyi kazandırırken başka bir
şeyi kaybettirir. Sırayla bakalım.

## Partitioner nedir?

**Partitioner**, producer tarafında çalışan ve "bu mesaj hangi partition'a gitsin?"
sorusuna karar veren bileşendir. Producer bir mesaj göndermeden **hemen önce**,
partitioner devreye girer ve hedef partition numarasını üretir.

Kafka'nın varsayılan davranışı şu: mesajın bir **key**'i varsa, o key'in hash'ini alıp
partition sayısına göre modunu alır (ikinci yazıdaki `hash(key) % partition_sayısı`).
Key yoksa (`null`), başka bir strateji devreye girer. İşte bu "başka strateji"
kısmının detayı, partitioner çeşitlerini konuşmamızı gerektiriyor.

Producer tarafında bu davranış, hangi partitioner sınıfının kullanılacağını belirten
tek bir konfigürasyon ayarıyla değiştirilir. Şimdi seçeneklere tek tek bakalım.

## 1. Hash-Based (Keyed) Partitioner — varsayılan

İkinci yazıda detaylıca anlattığımız mekanizma budur. Mesaja bir key verirsin
(`order_id`, `user_id` gibi) ve Kafka o key'in hash'ine göre partition seçer.

```
order_id = 5   →  hash(5) % 3  →  P1  (her zaman)
```

Buradaki en kritik özellik: **aynı key her zaman aynı partition'a gider.** Böylece aynı
siparişe ait tüm event'ler ("oluşturuldu → ödendi → kargolandı") tek bir partition'da,
offset sırasıyla, **sıralı** kalır.

> Sıralamaya ihtiyacın varsa, doğru cevap neredeyse her zaman budur.

Bu yüzden CDC (Change Data Capture), finans, e-ticaret gibi aynı entity'nin
event'lerinin doğru sırayla işlenmesi gereken her senaryoda bu strateji kullanılır. Bu
projedeki pipeline'da da (`order_id` key olarak) tam olarak bu vardır.

## 2. Round-Robin Partitioner

Round-Robin, key'e hiç bakmadan mesajları partition'lara **sırayla** dağıtır: birinci
mesaj P0'a, ikinci P1'e, üçüncü P2'ye, dördüncü tekrar P0'a…

```
mesaj 1 → P0
mesaj 2 → P1
mesaj 3 → P2
mesaj 4 → P0
```

İlk bakışta cazip: yük partition'lara kusursuz eşit dağılır, hot key riski yok. Ama
burada büyük bir bedel var.

### Round-Robin sıralamayı bozar

Diyelim aynı kullanıcının üç event'i sırayla geliyor:

```
User_A → Sipariş Oluşturuldu   → P0
User_A → Ödeme Tamamlandı      → P1
User_A → Kargo Hazırlandı      → P2
```

Kafka sıralama garantisini **sadece partition içinde** verir — bunu ikinci yazıda
konuşmuştuk. Bu üç event üç farklı partition'a düştüğü için, consumer'lar bunları
birbirinden bağımsız ve asenkron okur. "Ödeme Tamamlandı"yı işleyen consumer, "Sipariş
Oluşturuldu"yu işleyenden daha hızlı davranabilir. Sonuç: ortada sipariş yokken ödeme
işlenmeye çalışılır — klasik bir **race condition** ve veri tutarsızlığı.

> Round-Robin, ilişkili event'lerin sırasını kaybettirir. Sıralamanın önemli olduğu
> hiçbir yerde kullanılmaz.

## 3. Sticky Partitioner — modern varsayılan (key = null)

Peki amacın "key vermiyorum, veriler eşit dağılsın" ise? Bunun için Round-Robin'e
gerek yok. Kafka 2.4'ten beri, key `null` olduğunda devreye giren varsayılan
mekanizma **Sticky Partitioner**'dır ve eski Round-Robin'in yerini tamamen almıştır.

Aradaki fark performansta:

- **Round-Robin** her tekil mesajı farklı bir partition'a gönderir. Bu, network
  paketlerinin (batch) dolmadan sürekli gidip gelmesine, yani yüksek **overhead**'e yol
  açar.
- **Sticky Partitioner** ise mesajları batch'ler halinde toplar. Bir batch dolana kadar
  tüm mesajları **aynı** partition'a yazar; batch dolup gönderilince bir sonraki
  partition'a geçer.

Sonuçta yük yine partition'lara dengeli dağılır ama batch'ler tam dolduğu için
throughput (veri geçiş hızı) belirgin şekilde artar. Metrik toplama, IoT sensör
verisi, clickstream gibi sıranın önemsiz olduğu senaryolarda ideal seçenek budur.

Not: Sticky Partitioner da tıpkı Round-Robin gibi sıra garantisi **vermez** — sadece
onu daha performanslı bir şekilde yapmaz.

## 4. Custom Partitioner

Bazen hazır stratejilerin hiçbiri iş mantığına uymaz. O zaman `Partitioner`
arayüzünü kendin implement edip özel bir sınıf yazarsın.

En klasik senaryo **multi-tenancy** ve **hot partition** problemidir. Diyelim bir SaaS
şirketisin: bir tane devasa "Premium" müşterin, bir de yüzlerce küçük "Free" müşterin
var. Eğer hash'e bırakırsan, Premium müşterinin milyonlarca event'i tek bir partition'a
düşüp o partition'ı kilitleyebilir — ikinci yazıdaki **data skew** probleminin ta
kendisi.

Custom partitioner ile yükü şöyle izole edebilirsin: mesaj Premium bir müşteriden
geliyorsa onu ayrılmış birkaç partition'a dağıt, Free müşterilerin hepsini ise tek bir
partition'a topla. Şema olarak:

```
Premium tenant  →  P0, P1, P2  (yük dağıtılır)
Free tenant'lar →  P3          (hepsi tek partition'da toplanır)
```

Buradaki fikir şu: partition seçimini artık matematik değil, **iş mantığı** belirliyor.
Multi-tenancy, co-location (ilişkili verileri kasıtlı olarak aynı partition'da tutma)
ya da co-partitioning gibi özel ihtiyaçlar için bu yol açılır. Ama bir bedeli var:
sıralama, hot key ve rebalancing gibi tüm garantilerin sorumluluğu artık **sende**.

## Gerçek dünyada hangisi ne kadar kullanılır?

Teorik olarak dört seçenek de masada. Ama üretim (production) ortamlarındaki gerçek
dağılım oldukça dengesizdir:

| Partitioner | Kullanım Oranı | En Çok Nerede | Sıralama Garantisi |
|---|---|---|---|
| **Hash-Based (Keyed)** | ~%75–80 | CDC, finans, e-ticaret, event akışları | Evet (aynı key için) |
| **Sticky / Default (key=null)** | ~%15–20 | Metrik, IoT, clickstream | Hayır |
| **Custom** | ~%1–5 | Multi-tenancy, co-location | Senaryoya göre |
| **Round-Robin** | <%1 | Test / nadir legacy sistemler | Hayır |

Neden bu kadar dengesiz?

- **Hash-Based ezici çoğunlukta**, çünkü gerçek projelerin çoğunda veri tutarlılığı ve
  işlem sırası her şeyden önemli. Aynı kaydın (aynı primary key'e sahip satırın)
  `INSERT → UPDATE → DELETE` event'lerinin sırayla işlenmesi gerekir; aksi halde
  hedefteki replika bozulur.
- **Sticky, anahtarsız veri için standart** hale geldi ve eski Round-Robin'i emekliye
  ayırdı.
- **Custom nadir**, çünkü ancak varsayılan algoritmanın yetmediği özel durumlarda
  yazılır — ve yazması da bakımı da maliyetlidir.
- **Round-Robin neredeyse hiç kullanılmaz**: hem sırayı bozar hem de her mesaj için ayrı
  network paketi açarak performansı düşürür. Anahtarsız veri için zaten daha iyisi
  (Sticky) var.

## Özet: karar matrisi

Yeni bir pipeline tasarlarken tek bir soru genellikle yönünü belirler:

> **İlişkili event'lerin sırası önemli mi?**

- **Evet** → mesaja anlamlı bir **key** ver (`order_id`, `user_id`) ve varsayılan
  **Hash-Based** partitioner ile ilerle. Sıra korunur.
- **Hayır, tek derdim maksimum throughput ve eşit dağılım** → key'i `null` bırak,
  **Sticky Partitioner** işi otomatik ve performanslı halletsin.
- **Varsayılanların hiçbiri iş mantığıma uymuyor** (hot tenant izolasyonu, co-location)
  → o zaman ve ancak o zaman bir **Custom Partitioner** yaz.

Round-Robin'i ise pratikte listeden çıkarabilirsin. "Anahtarsız ama eşit dağılım"
istediğin her yerde onun modern ve daha hızlı hali olan Sticky Partitioner zaten
devrede.

Bir sonraki yazıda, bu şekilde partition'lara yazılan veriyi consumer tarafında nasıl
ölçekli okuduğumuza — consumer group'lar, rebalancing ve offset commit stratejilerine —
daha yakından bakacağız.
