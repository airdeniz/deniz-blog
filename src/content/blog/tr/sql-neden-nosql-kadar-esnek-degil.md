---
title: 'SQL Neden "Esnek" Sayılmaz — ve Neden Doğru Soru "SQL mi, NoSQL mi" Değil?'
description: 'ALTER TABLE ile bir kolon saniyeler içinde ekleniyorsa SQL''e neden "esnek değil" deniyor? Çünkü esneklik iki ayrı şeydir: kolon eklemenin mikro esnekliği ile milyarlarca satırı kesintisiz değiştirmenin, şemasız veri tutmanın ve yatay ölçeklenmenin mimari esnekliği. Bu yazı, SQL''in katılığının bir kusur değil bilinçli bir güvenlik tercihi olduğunu ve gerçek dünyanın cevabının ikisini aynı projede birleştirmek (polyglot persistence) olduğunu anlatıyor.'
pubDate: 2026-07-14
tags: ['SQL', 'NoSQL', 'Veritabanı', 'Polyglot Persistence', 'Ölçekleme', 'Backend']
draft: false
---

Bir tabloya kolon eklemek çoğu zaman tek satırlık bir iştir:

```sql
ALTER TABLE urunler ADD COLUMN garanti_suresi INT;
```

Komut saniyeler içinde tamamlanır. Tam da bu yüzden "SQL, NoSQL'e kıyasla esnek
değildir" cümlesi ilk duyulduğunda haksız gelir: yeni bir alan eklemek, bir kolonu
silmek ya da bir kolona index tanımlamak bu kadar kolayken, nesi esnek değil?

Buradaki incelik şu: "esneklik" kelimesi iki bambaşka şeyi kastediyor. DBeaver'da tek
bir `ALTER TABLE` çalıştırmak **mikro düzeyde** bir esnekliktir. Mimari düzeydeki
"esneklik" ise bambaşka bir şeydir: veritabanının **değişken veri tiplerine anında
uyum sağlaması**, **milyarlarca satırı kesinti yaratmadan** değiştirebilmesi ve
**sınırsızca yatay genişleyebilmesi**.

Bu yazı önce SQL'in neden "katı şemalı" (rigid schema) sayıldığını dört başlıkta
kuruyor, ardından bu katılığın bir kusur değil bir **güvenlik tercihi** olduğunu
gösteriyor — ve sonunda, gerçek dünyada sorunun "SQL mi, NoSQL mi" olmadığını,
ikisini bir arada kullanmak olduğunu somut bir senaryoyla anlatıyor.

## 1. "Sınıfta herkes aynı üniformayı giyer" kuralı

SQL'de bir tabloya yeni bir kolon eklendiğinde, o kolon tablodaki **tüm satırlar**
için geçerli olur. İstisnası yoktur.

`urunler` tablosuna `garanti_suresi` kolonu eklendiğini düşünelim. Tabloda 10 milyon
ürün varsa, o 10 milyon satırın tamamında artık bir `garanti_suresi` alanı vardır.
Garantisi olmayan ürünlerde bu alan mecburen `NULL` kalır. Her satır aynı şema
üniformasını giymek zorundadır — alan boş dursa bile o hücre orada durur ve yer
kaplar.

NoSQL'in belge (document) tarafında — örneğin MongoDB'de — "tablo" yerine
**koleksiyon**, "satır" yerine **doküman** vardır ve her doküman diğerlerinden
bağımsızdır:

```
SQL (her satır aynı şema)          NoSQL / Document (her doküman kendi şeması)
+------+---------+----------+       { "ad": "Telefon", "ram": "8GB",
| id   | ad      | garanti  |         "garanti": 24 }
+------+---------+----------+
| 1    | Telefon | 24       |       { "ad": "Elma", "kilo": 1.5 }
| 2    | Elma    | NULL     |         ← "garanti" alanı hiç yok, yer kaplamıyor
+------+---------+----------+
```

Her doküman kendi yapısını kendisi belirler; bir dokümanda olmayan alan, onun için
hiç var olmaz — tanımlanmasına bile gerek yoktur. "Şemasız" (schemaless) denen
esneklik tam olarak budur.

## 2. Canlıda kolon eklemek "tek satırlık iş" değildir

Geliştirme ortamında, boş ya da az verili bir tabloda `ALTER TABLE ADD COLUMN`
gerçekten bir saniye sürer. Canlı (production) ortamda ise tablo başka türlü döner.

Yüz milyonlarca satır içeren ve saniyede binlerce sorgu alan bir tabloya yeni bir
kolon eklendiğini düşünelim. SQL motoru bu değişikliği uygularken çoğu zaman tabloyu
**kilitler** (write lock / table lock). Kilit süresince kullanıcılar o tabloya veri
yazamaz, bazı durumlarda okuyamaz da. Sistem geçici olarak durur — **downtime**
yaşanır. Büyük sistemlerde SQL şemasını değiştirmek bu yüzden ciddi planlama, bakım
penceresi ve risk yönetimi ister. (Modern veritabanlarındaki online DDL ve
`pt-online-schema-change` gibi araçlar bunu hafifletir, ama sorunun kendisi ortadan
kalkmaz.)

NoSQL'de ise şema olmadığı için veritabanına "yeni bir kolon ekliyorum" denmez.
Backend kodunda yeni kaydedilen dokümana bir alan eklenir; veritabanı bunu doğrudan
kabul eder. Ne kilit oluşur ne kesinti. Eski dokümanlar o alan olmadan yaşamaya devam
eder.

## 3. İlişkisel bağlar (Foreign Key) ayak bağına dönüşebilir

SQL'in asıl gücü **ilişkisel** (relational) olmasından gelir. Tablolar birbirine
Foreign Key (yabancı anahtar) kurallarıyla bağlıdır ve bu bağlar verinin
tutarlılığını garanti eder.

Bir `siparisler` tablosunun `kullanicilar` tablosuna bağlı olduğunu düşünelim.
Sipariş yapısında ya da kullanıcı tablosunda köklü bir değişiklik istendiğinde, bu
kısıtlar (constraint'ler) yüzünden zincirdeki her halkayı tutarlı tutmak gerekir —
bir domino etkisi doğar. Bu bağlar veriyi güvende tutar, ama değişimi de yavaşlatır.

NoSQL'in belge tarafında ilişkiler genellikle gevşektir ya da veri **iç içe
(embedded)** saklanır. Müşterinin adı ve adresi doğrudan sipariş dokümanının içine
gömülebilir. İlişkisel bağ olmadığı için bir tarafı değiştirmek diğerini kırmaz — ama
bunun da bir bedeli vardır: aynı müşteri bilgisi birçok dokümanda tekrarlanır ve
tutarlılığı korumak artık **uygulamanın** sorumluluğuna geçer.

## 4. Yatay ölçekleme (horizontal scaling) zorluğu

Veri tek bir sunucuya sığmayacak kadar büyüdüğünde, onu birden fazla sunucuya
dağıtmak gerekir. SQL ile NoSQL'in yollarının en sert ayrıldığı yer burasıdır.

SQL tabloları birbirine `JOIN`'lerle bağlı olduğu için veriyi farklı sunuculara
bölmek (**sharding**) zordur. `A` tablosu bir sunucuda, `B` tablosu başka bir
sunucudaysa, ikisini hızlı bir `JOIN` ile birleştirmek pahalıdır — sorgu, sunucular
arası ağ trafiğine takılır. Bu yüzden SQL genellikle **dikey** ölçeklenir: daha
güçlü, daha pahalı **tek bir** sunucuya doğru büyür.

NoSQL'de ise her doküman kendi içinde bütündür (self-contained) ve katı ilişkiler
yoktur; veri onlarca sunucuya rahatça dağıtılabilir. Sistem tıkandıkça arkaya bir
sunucu daha eklenir; büyüme **yatay** ve neredeyse doğrusaldır.

| Kriter | SQL (İlişkisel) | NoSQL (örn. Document) |
| --- | --- | --- |
| **Şema** | Katı — her satır aynı şemayı taşır | Esnek — her doküman kendi şemasını belirler |
| **Kolon ekleme** | `ALTER TABLE`, canlıda kilit riski | Koda alan eklenir, kesinti yok |
| **İlişkiler** | Foreign Key ile sıkı, tutarlı | Gevşek ya da iç içe (embedded) |
| **Ölçekleme** | Dikey — daha güçlü tek sunucu | Yatay — sunucu ekleyerek dağıt |
| **Tutarlılık** | Güçlü (ACID), motor garanti eder | Genellikle uygulama sorumluluğunda |

## Katılık bir kusur değil, bir tercihtir

Bu tabloya bakıp "o zaman NoSQL her açıdan üstün" sonucuna varmak yanlış olur.
SQL'in katılığı boşuna değildir — her maddesi bir **güvence** karşılığında gelir.

SQL, katı kurallarını ve güvenlik önceliğini **ACID** (Atomicity, Consistency,
Isolation, Durability) prensipleriyle yönetir. Şemanın katılığı, hatalı veriyi kapıda
durdurur. Foreign Key'ler, olmayan bir kullanıcıya sipariş yazılmasını engeller. Tek
sunucudaki güçlü tutarlılık, iki işlemin aynı bakiyeyi bozmasına izin vermez. SQL'in
"esnek olmaması", verinin **her zaman tutarlı ve güvenli** kalmasının bedelidir.

NoSQL'in esnekliği ise çoğu zaman bu garantilerin bir kısmını gevşetmek anlamına
gelir. Bu bir kusur değil, **farklı bir tercihtir**. Doğru soru "hangisi daha iyi"
değil, "eldeki iş hangisini istiyor" sorusudur.

Gerçek dünyanın cevabı da tam burada saklı: çoğu büyük sistem bu ikisi arasında
**seçim yapmaz**.

## Gerçek cevap: Polyglot Persistence

Üretimdeki büyük ve ölçeklenebilir projelerin neredeyse tamamı **polyglot
persistence** denen yaklaşımı kullanır: tek bir veritabanı teknolojisine bağlanmak
yerine, **her iş için o işe en uygun** veritabanını seçmek ve hepsini aynı projede
bir arada çalıştırmak.

Bunu somutlaştırmak için dev bir e-ticaret platformu (Trendyol, Hepsiburada tarzı)
senaryosuna bakalım. Böyle bir sistemde her verinin karakteri — ihtiyaç duyduğu
güvenlik ve hız düzeyi — farklıdır. Mimarlar da veriyi bu yüzden farklı çekmecelere
böler:

<pre style="width:max-content;max-width:100%;margin-inline:auto">
                  +-----------------------------------+
                  |        KULLANICI / İSTEMCİ        |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |            API GATEWAY            |
                  +-----------------------------------+
                                    |
         +--------------------------+--------------------------+
         |                          |                          |
         v                          v                          v
+------------------+       +------------------+       +------------------+
| Sipariş & Ödeme  |       |  Ürün Kataloğu   |       |  Sepet & Oturum  |
|     Servisi      |       |     Servisi      |       |     Servisi      |
+------------------+       +------------------+       +------------------+
         |                          |                          |
         v                          v                          v
+------------------+       +------------------+       +------------------+
|    POSTGRESQL    |       |     MONGODB      |       |      REDIS       |
|   (SQL / ACID)   |       | (NoSQL/Document) |       | (NoSQL/In-Mem)   |
+------------------+       +------------------+       +------------------+
</pre>

### Sipariş, ödeme, finans → SQL (PostgreSQL)

Ödeme ve sipariş süreçlerinde **tutarlılık hayatidir**. Bir müşteri ödeme yaptığında
paranın hesaptan düşmesi, faturanın kesilmesi ve stoktan düşülmesi ya birlikte
başarılı olmalı ya da bir hata varsa tamamı geri alınmalıdır (ACID'in *atomicity*
ilkesi). Buradaki sipariş, `kullanicilar` tablosundaki ID'ye ve `odemeler`
tablosundaki işlem ID'sine Foreign Key ile bağlanır. Bu çekmecede 1 kuruşluk
tutarsızlık bile kabul edilemez — bu yüzden katı, ilişkisel, ACID uyumlu bir SQL
veritabanı seçilir.

### Ürün kataloğu → NoSQL / Document (MongoDB)

E-ticarette milyonlarca farklı ürün vardır ve **her ürünün özellikleri (şeması)
bambaşkadır:**

- Bir cep telefonu: RAM, depolama, kamera çözünürlüğü, ekran boyutu
- Bir tişört: beden, renk, kumaş türü, yaka tipi
- Bir elma: sadece kilo

Bu katalog SQL'de tutulsaydı, ya her kategori için yüzlerce kolon açmak ya da
karmaşık `JOIN` tabloları kurmak gerekirdi — ve bu tabloların çoğu `NULL` ile
dolardı. MongoDB gibi bir belge veritabanında ise her ürün kendi JSON şemasıyla
saklanır. Sisteme yeni bir ürün tipi eklemek, canlıyı kapatmadan, `ALTER TABLE`
beklemeden anında yapılır. Buradaki işin istediği **esnekliktir**, tutarlılık değil.

### Sepet ve oturum → NoSQL / In-Memory (Redis)

Kullanıcının sepetindeki ürünler ve oturum (session) bilgisi **çok hızlı** okunup
yazılmalıdır, ama ömür boyu saklanmaları gerekmez. Redis veriyi diskte değil
**RAM'de** (in-memory) tutar; bu sayede saniyede yüz binlerce okuma/yazmayı
mikrosaniyeler düzeyinde karşılar. Sepete ürün eklendiğinde veri doğrudan Redis'e
yazılır. "Siparişi tamamla" butonuna basıldığı an sepet Redis'ten okunur, doğrulanır
ve **kalıcı ve güvenli** saklanmak üzere PostgreSQL'e aktarılır. Bu çekmecenin
önceliği tutarlılık değil, saf **hızdır**.

### Arama ve filtreleme → NoSQL / Arama motoru (Elasticsearch)

Arama kutusuna "mavi spor ayakkabı" yazıldığında, milyarlarca satırda
`LIKE '%mavi%'` araması yapmak SQL'i zorlar — sorgu saniyeler sürer, sistemi
kilitler. Elasticsearch gibi bir arama motoru ise kelimeleri önceden **indeksler**;
yazım hatalarını tolere ederek en uygun sonuçları milisaniyeler içinde döndürür.
Burada belirleyici olan **arama performansıdır**.

## Bu veritabanları birbiriyle nasıl konuşur?

Bu sistemde her servis kendi işinden ve kendi veritabanından sorumludur (mikroservis
mimarisi). Peki bir serviste değişen veri diğerine nasıl ulaşır? Cevap: doğrudan
değil, bir **message broker** (örneğin Kafka) üzerinden.

Tipik bir satın alma akışı şöyle işler:

1. **Sepet Servisi (Redis)** sepeti hazır tutar.
2. Kullanıcı "Satın Al" dediğinde **Sipariş Servisi (PostgreSQL)** devreye girer,
   ödemeyi ACID güvencesiyle doğrular ve siparişi kalıcı olarak yazar.
3. Sipariş tamamlanınca arka planda bir Kafka topic'ine **"X ürünü satıldı"** mesajı
   yayınlanır.
4. Bu mesajı dinleyen **Ürün Servisi (MongoDB)**, ilgili ürünün stok adedini
   günceller.
5. Aynı mesajı dinleyen **Arama Servisi (Elasticsearch)** de sonuçlardaki stok
   bilgisini tazeler.

Böylece her veritabanı kendi güçlü olduğu işi yaparken diğerlerinden kopmaz; hepsi,
olaylar (event'ler) üzerinden gevşek bağlı bir orkestra gibi çalışır.

## Özet: esneklik bir eksik değil, bir eksen

`ALTER TABLE` ile kolon eklemek de bir esnekliktir, ama mikro düzeyde. "SQL esnek
değil" derken kastedilen mimari esneklik başka bir eksende yaşar — ve SQL onu,
verinin her zaman tutarlı ve güvenli kalması uğruna bilerek kısıtlar. "Esnek olmama"
dediğimiz şey, bu güvenlik tercihinin ta kendisidir.

Dolayısıyla doğru okuma "SQL zayıf, NoSQL güçlü" değildir. İkisi bir **eksenin iki
ucudur:** bir uçta katı tutarlılık ve güvenlik, diğer uçta esneklik ve ölçek. Gerçek
dünyadaki büyük sistemler bu uçlardan birini seçmez; **her işi kendi ucuna**
yerleştirir. Sipariş ve ödeme PostgreSQL'de durur, katalog MongoDB'de, sepet
Redis'te, arama Elasticsearch'te — ve hepsi Kafka üzerinden konuşur. Modern bir
mimaride tek bir kahraman yoktur: **SQL güvenliği sağlar, NoSQL esnekliği ve hızı
taşır.**
