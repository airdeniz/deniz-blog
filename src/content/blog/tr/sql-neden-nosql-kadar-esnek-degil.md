---
title: 'SQL Neden NoSQL Kadar "Esnek" Değil — ve İkisi Aynı Projede Nasıl Bir Arada Çalışır?'
description: 'ALTER TABLE ile saniyeler içinde kolon ekleniyorsa SQL neden "esnek değil" sayılır? Çünkü "esneklik" iki ayrı şeydir: bir kolon eklemek gibi mikro esneklik ile milyarlarca satırı kesintisiz değiştirme, esnek şema ve yatay ölçekleme gibi mimari esneklik. Katılığın neden bir güvenlik tercihi olduğunu ve gerçek dünyanın cevabının ikisini bir arada kullanmak (polyglot persistence) olduğunu anlatan bir yazı.'
pubDate: 2026-07-14
tags: ['SQL', 'NoSQL', 'Veritabanı', 'Polyglot Persistence', 'Ölçekleme', 'Backend']
draft: false
---

Bir tabloya kolon eklemek çoğu zaman tek satırlık bir iştir:

```sql
ALTER TABLE urunler ADD COLUMN garanti_suresi INT;
```

Komut saniyeler içinde biter. Tam da bu yüzden "SQL, NoSQL'e kıyasla esnek değildir" cümlesi ilk
duyulduğunda kulağa haksız gelir: madem yeni bir alan eklemek, bir kolonu silmek ya da bir kolona
index eklemek bu kadar kolay, nesi esnek değil?

Yakalanması gereken nokta şu: "esneklik" kelimesi burada iki bambaşka şeyi kastediyor. DBeaver'da
tek bir `ALTER TABLE` çalıştırmak **mikro düzeyde** bir esnekliktir. Mimari düzeyde "esneklik" ise
çok daha başka bir şeyi: veritabanının **değişken veri tiplerine anında uyum sağlaması**,
**milyarlarca satırı kesinti yaratmadan** değiştirebilmesi ve **sınırsızca yatay
genişleyebilmesini** kasteder.

Bu yazı SQL'in neden "katı şemalı" (rigid schema) sayıldığını dört başlıkta kuruyor, sonra bu
katılığın aslında bir kusur değil bir **güvenlik tercihi** olduğunu gösteriyor — ve en sonunda
gerçek dünyada sorunun "SQL mi, NoSQL mi" olmadığını, ikisini bir arada kullanmak olduğunu somut
bir senaryoyla anlatıyor.

## 1. "Sınıfta herkes aynı üniformayı giyecek" kuralı

SQL'de bir tabloya yeni bir kolon eklendiğinde, o kolon tablodaki **tüm satırlar** için geçerli
olur. İstisna yoktur.

`urunler` tablosuna `garanti_suresi` kolonu eklendiğini düşünelim. Tabloda 10 milyon ürün varsa,
artık o 10 milyon satırın tamamında `garanti_suresi` alanı açılır. Garantisi olmayan ürünlerde bu
alan zorunlu olarak `NULL` (boş) kalır. Yani her satır aynı şema üniformasını giymek zorundadır —
kimi alan boş dursa bile o hücre orada durur ve yer kaplar.

NoSQL'in belge (document) tarafında — örneğin MongoDB'de — "tablo" yerine **koleksiyon**, "satır"
yerine **doküman** vardır ve her doküman birbirinden bağımsızdır:

```
SQL (her satır aynı şema)          NoSQL / Document (her doküman kendi şeması)
+------+---------+----------+       { "ad": "Telefon", "ram": "8GB",
| id   | ad      | garanti  |         "garanti": 24 }
+------+---------+----------+
| 1    | Telefon | 24       |       { "ad": "Elma", "kilo": 1.5 }
| 2    | Elma    | NULL     |         ← "garanti" alanı hiç yok, yer kaplamıyor
+------+---------+----------+
```

Her doküman kendi yapısını kendisi belirler; bir dokümanda olmayan alan, onun için hiç var olmaz —
tanımlanmasına bile gerek yoktur. İşte "şemasız" (schemaless) denen esneklik budur.

## 2. Canlıda kolon eklemek "bir satırlık iş" değildir

Geliştirme ortamında boş ya da az verili bir tabloya `ALTER TABLE ADD COLUMN` demek gerçekten 1
saniye sürer. Ama canlı (production) ortamda işler değişir.

İçinde yüz milyonlarca satır olan ve saniyede binlerce sorgu alan bir tabloya yeni bir kolon
eklendiğini düşünelim. SQL motoru bu değişikliği yaparken çoğu zaman tabloyu **kilitler** (write
lock / table lock). Bu kilit süresince canlıdaki kullanıcılar o tabloya veri yazamaz, bazı
durumlarda okuyamaz da. Yani sistem geçici olarak felç olur — **downtime** yaşanır. Büyük
sistemlerde SQL şeması değiştirmek bu yüzden ciddi planlama, bakım penceresi ve risk yönetimi
ister. (Modern veritabanlarında online DDL ve `pt-online-schema-change` gibi araçlar bunu
hafifletir, ama sorunun kendisi hâlâ oradadır.)

NoSQL'de ise şema olmadığı için veritabanına "yeni bir kolon ekliyorum" denmez. Backend kodunda
yeni kaydedilen dokümana yeni bir alan eklenir ve veritabanı bunu doğrudan kabul eder. Ne
kilitlenme olur, ne de kesinti. Eski dokümanlar o alan olmadan yaşamaya devam eder.

## 3. İlişkisel bağlar (Foreign Key) ayak bağına dönüşebilir

SQL'in asıl gücü **ilişkisel** (relational) olmasından gelir. Tablolar birbirine Foreign Key
(yabancı anahtar) kurallarıyla bağlıdır ve bu, verinin tutarlılığını garanti eder.

Bir `siparisler` tablosu, `kullanicilar` tablosuna bağlı olsun. Sipariş yapısında ya da kullanıcı
tablosunda radikal bir değişiklik yapılmak istendiğinde, bu ilişkisel kısıtlar (constraint'ler)
yüzünden zincirleme olarak her şeyi tutarlı tutmak gerekir — bir domino etkisi doğar. Bu bağlar
veriyi güvende tutar, ama aynı zamanda değişimi yavaşlatır.

NoSQL'in belge tarafında ilişkiler genellikle gevşektir ya da veri **iç içe (embedded)**
saklanır. Sipariş dokümanının içine doğrudan müşterinin adı ve adresi gömülebilir. İlişkisel bağ
olmadığı için bir tarafı değiştirmek diğer tarafı kırmaz — ama bunun bedeli de vardır: aynı
müşteri bilgisi birçok dokümanda tekrarlanır ve tutarlılığı korumak artık **uygulamanın**
sorumluluğuna geçer.

## 4. Yatay ölçekleme (horizontal scaling) zorluğu

Veri tek bir sunucuya sığmayacak kadar büyüdüğünde, onu birden fazla sunucuya dağıtmak gerekir.
İşte SQL ile NoSQL'in yolunun en sert ayrıldığı yer burasıdır.

SQL tabloları birbirine `JOIN`'lerle bağlı olduğu için veriyi farklı sunuculara bölmek
(**sharding**) zordur. `A` tablosu bir sunucuda, `B` tablosu başka bir sunucudaysa, bunları hızlı
bir `JOIN` ile birleştirmek maliyetlidir — sorgu sunucular arası ağ trafiğine takılır. Bu yüzden
SQL genellikle **dikey** ölçeklenir: daha güçlü, daha pahalı **tek bir** sunucuya doğru büyür.

NoSQL'de ise her doküman kendi içinde bağımsız (self-contained) olduğu ve katı ilişkiler
bulunmadığı için, veri onlarca sunucuya rahatça dağıtılabilir. Sistem tıkandıkça arkaya bir sunucu
daha eklenir; **yatay** olarak, neredeyse doğrusal büyür.

| Kriter | SQL (İlişkisel) | NoSQL (örn. Document) |
| --- | --- | --- |
| **Şema** | Katı — her satır aynı şemayı taşır | Esnek — her doküman kendi şemasını belirler |
| **Kolon ekleme** | `ALTER TABLE`, canlıda kilit riski | Koda alan eklenir, kesinti yok |
| **İlişkiler** | Foreign Key ile sıkı, tutarlı | Gevşek ya da iç içe (embedded) |
| **Ölçekleme** | Dikey — daha güçlü tek sunucu | Yatay — sunucu ekleyerek dağıt |
| **Tutarlılık** | Güçlü (ACID), motor garanti eder | Genellikle uygulama sorumluluğunda |

## Katılık bir kusur değil, bir tercihtir

Buradaki tabloya bakıp "o zaman NoSQL her açıdan üstün" sonucuna varmak yanlış olur. SQL'in tüm bu
katılığı boşuna değildir — her biri bir **güvence** karşılığında gelir.

SQL, katı kurallarını ve güvenlik önceliğini **ACID** (Atomicity, Consistency, Isolation,
Durability) prensipleriyle yönetir. Şemanın katı olması, hatalı veriyi kapıda durdurur. Foreign
Key'ler, olmayan bir kullanıcıya sipariş yazılmasını engeller. Tek sunucuda güçlü tutarlılık, iki
işlemin aynı bakiyeyi bozmasına izin vermez. Yani SQL'in "esnek olmaması", verinin **her zaman
tutarlı ve güvenli** kalmasının bedelidir.

NoSQL'in esnekliği ise çoğu zaman bu garantilerden bir kısmını gevşetmek anlamına gelir. Bu bir
kusur değildir; sadece **farklı bir tercih**tir. Doğru soru "hangisi daha iyi" değil, "eldeki iş
hangisini istiyor" sorusudur.

Ve işte gerçek dünyanın cevabı da tam burada saklı: çoğu büyük sistem bu ikisi arasında **seçim
yapmaz**.

## Gerçek cevap: Polyglot Persistence

Üretim ortamındaki büyük ve ölçeklenebilir projelerin neredeyse tamamı **polyglot persistence**
denen yaklaşımı kullanır: tek bir veritabanı teknolojisine sıkışıp kalmak yerine, **her iş için o
işe en uygun** veritabanını seçmek ve hepsini aynı proje içinde bir arada çalıştırmak.

Bunu somutlaştırmak için dev bir e-ticaret platformu (Trendyol, Hepsiburada tarzı) senaryosuna
bakalım. Böyle bir sistemde her verinin karakteri — ihtiyaç duyduğu güvenlik ve hız seviyesi —
farklıdır. Bu yüzden mimarlar veriyi farklı çekmecelere böler:

```
                  +-----------------------------------+
                  |         KULLANICI / İSTEMCİ       |
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
```

### Sipariş, ödeme, finans → SQL (PostgreSQL)

Ödeme ve sipariş süreçlerinde **tutarlılık hayati** önem taşır. Bir müşteri ödeme yaptığında;
paranın hesaptan düşmesi, faturanın kesilmesi ve stoktan düşülmesi işlemlerinin ya tamamı birlikte
başarılı olmalı, ya da bir hata varsa tamamı geri alınmalıdır (ACID'in *atomicity* ilkesi).
Buradaki sipariş, `kullanicilar` tablosundaki ID'ye ve `odemeler` tablosundaki işlem ID'sine
Foreign Key ile bağlanır. Bu çekmecede 1 kuruşluk bir tutarsızlık bile kabul edilemez — bu yüzden
katı, ilişkisel, ACID uyumlu bir SQL veritabanı seçilir.

### Ürün kataloğu → NoSQL / Document (MongoDB)

E-ticarette milyonlarca farklı ürün vardır ve **her ürünün özellikleri (şeması) bambaşkadır:**

- Bir cep telefonu: RAM, depolama, kamera çözünürlüğü, ekran boyutu
- Bir tişört: beden, renk, kumaş türü, yaka tipi
- Bir elma: sadece kilo

Bu katalog SQL'de tutulsaydı, ya her kategori için yüzlerce kolon açmak ya da karmaşık `JOIN`
tabloları kurmak gerekirdi — ve bu tabloların çoğu `NULL` ile dolardı. MongoDB gibi bir belge
veritabanında ise her ürün kendi JSON şemasıyla esnek şekilde saklanır. Sisteme yeni bir ürün tipi
eklemek, canlıyı kapatmadan, `ALTER TABLE` beklemeden anında yapılır. Buradaki iş **esneklik**
istiyor, tutarlılık değil.

### Sepet ve oturum → NoSQL / In-Memory (Redis)

Kullanıcının sepetindeki ürünler ve oturum (session) bilgisi **çok hızlı** okunup yazılmalı, ama
ömür boyu saklanması gerekmez. Redis veriyi diskte değil **RAM'de** (in-memory) tutar; bu yüzden
saniyede yüz binlerce okuma/yazmayı mikrosaniyeler düzeyinde yapar. Sepete ürün eklendiğinde veri
doğrudan Redis'e yazılır. "Siparişi tamamla" butonuna basıldığı an sepet Redis'ten okunur,
doğrulanır ve **kalıcı/güvenli** saklanmak üzere PostgreSQL'e aktarılır. Bu çekmecenin önceliği
tutarlılık değil, saf **hız**.

### Arama ve filtreleme → NoSQL / Arama motoru (Elasticsearch)

Arama kutusuna "mavi spor ayakkabı" yazıldığında, milyarlarca satırda `LIKE '%mavi%'` araması
yapmak SQL'i dize getirir — sorgu saniyeler sürer, sistemi kilitler. Elasticsearch gibi bir arama
motoru ise kelimeleri önceden **indeksler**; yazım hatalarını tolere ederek en uygun sonuçları
milisaniyeler içinde döndürür. Burada belirleyici olan **arama performansı**.

## Bu veritabanları birbiriyle nasıl konuşur?

Bu sistemde her servis kendi işinden ve kendi veritabanından sorumludur (mikroservis mimarisi).
Peki bir serviste değişen veri, diğerine nasıl yansır? Cevap: doğrudan değil, bir **message
broker** (örneğin Kafka) üzerinden.

Tipik bir satın alma akışı şöyle işler:

1. **Sepet Servisi (Redis)** sepeti hazır tutar.
2. Kullanıcı "Satın Al" dediğinde **Sipariş Servisi (PostgreSQL)** devreye girer, ödemeyi ACID
   güvencesiyle doğrular ve siparişi kalıcı olarak yazar.
3. Sipariş tamamlanınca arka planda bir Kafka topic'ine **"X ürünü satıldı"** mesajı yayınlanır.
4. Bu mesajı dinleyen **Ürün Servisi (MongoDB)** ilgili ürünün stok adedini günceller.
5. Aynı mesajı dinleyen **Arama Servisi (Elasticsearch)** de sonuçlardaki stok bilgisini
   tazeler.

Böylece her veritabanı, kendi güçlü olduğu işi yaparken diğerlerinden kopmaz; olaylar (event'ler)
üzerinden gevşek bağlı bir orkestra gibi çalışır.

## Özet: esneklik bir eksik değil, bir eksen

`ALTER TABLE` ile kolon eklemek de bir esnekliktir, ama mikro düzeyde. "SQL esnek değil" derken
kastedilen mimari esneklik ise başka bir eksende yaşar — ve SQL onu, verinin her zaman tutarlı ve
güvenli kalması uğruna bilerek kısıtlar. "Esnek olmama" dediğimiz şey, aslında bu güvenlik
tercihinin ta kendisidir.

Dolayısıyla doğru okuma "SQL zayıf, NoSQL güçlü" değildir. İkisi bir **eksenin iki ucudur:** bir
uçta katı tutarlılık ve güvenlik, diğer uçta esneklik ve ölçek. Ve gerçek dünyadaki büyük
sistemler bu uçlardan birini seçmez; **her işi kendi ucuna** yerleştirir. Para PostgreSQL'de
durur, katalog MongoDB'de, sepet Redis'te, arama Elasticsearch'te — hepsi Kafka üzerinden
konuşur. Modern bir mimaride tek bir kahraman yoktur: **SQL güvenliği sağlar, NoSQL esnekliği ve
hızı taşır.**
