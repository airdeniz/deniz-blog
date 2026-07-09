---
title: 'Bir Veri Ne Zaman "Büyük Veri" Olur? Çizgiyi Nerede Çekiyoruz?'
description: 'Büyük veri sanılanın aksine "unstructured veri", "büyük şirketin verisi" ya da "real-time sistem" demek değildir. Sadece structured data ile büyük veri olur mu? Görünen veriyle asıl akan veri arasındaki fark ne? Real-time için illa büyük veri şart mı? Çizgiyi asıl belirleyen şeyi, yani geleneksel araçlarla büyük veri araçlarını ayıran mimari farkı, baştan ele alan bir yazı.'
pubDate: 2026-07-09
tags: ['Büyük Veri', 'Dağıtık Sistemler', 'Ölçekleme', 'Real-Time', 'Veri Mühendisliği', 'Backend']
draft: false
---

"Büyük veri" kavramı, konuşma dilinde neredeyse hep yanlış bir çağrışımla dolaşır. Kimileri
için o, ses kayıtları, videolar ve sosyal medya paylaşımlarından oluşan **unstructured**
(yapılandırılmamış) bir yığındır. Kimileri için **büyük şirketlerin** elindeki veridir —
küçük bir firmanınki "normal", devasa bir kurumunki "büyük" sayılır. Bir başkası için ise
**real-time** (gerçek zamanlı) akan her şey büyük veridir.

Üçü de yanlış. Daha doğrusu, üçü de büyük verinin kenarına dokunup asıl çizgiyi ıskalar. Bu
yazı, bu üç yanılgıyı tek tek yıkıp geriye kalan gerçek çizgiyi — bir verinin ne zaman
"büyük veri" olduğunu — baştan kurmayı deniyor. Yanılgıları teker teker açalım.

## Yanılgı 1: "Büyük veri, unstructured veridir"

En yaygın kısayol bu: büyük veri deyince akla ses, görüntü, log, tweet gelir. Peki ortada
**sadece structured (yapılandırılmış) veri** olsaydı büyük veriden söz edilebilir miydi?

**Kesinlikle edilebilirdi.** Verinin düzenli satır-sütun formatında olması, onun "büyük"
olmasını engellemez. Büyük veriyi tanımlarken bakılan şey verinin **tipi** değil, meşhur
**3V** kuralıdır: Volume (hacim), Velocity (hız) ve Variety (çeşitlilik). Çeşitlilik tek
başına yapılandırılmış veriyle sınırlı kalsa bile, diğer iki unsur büyük veri yaratmaya
fazlasıyla yeter.

**Volume (Hacim).** Yapılandırılmış bir veritabanındaki satır sayısı katrilyonlara
ulaştığında o veri büyüktür. Küresel bir bankanın tüm kredi kartı işlem geçmişi ya da bir
havayolunun anlık rezervasyon ve uçuş verisi — hepsi ilişkisel veritabanlarında (RDBMS)
tertemiz SQL formatında durur. Ama boyut petabaytları bulunca geleneksel tek sunucu bu
veriyi kaldıramaz hale gelir. İşte yapılandırılmış büyük veri tam burada başlar.

**Velocity (Hız).** Veri çok yüksek bir hızla akıp milisaniyeler içinde işlenmek zorunda
kalınca, yapısı ne kadar net olursa olsun bir büyük veri problemi doğar. IoT cihazlarından,
akıllı sayaçlardan ya da araç sensörlerinden akan telemetri genellikle
`[Cihaz_ID, Zaman_Damgası, Sıcaklık, Voltaj]` gibi son derece yapılandırılmış bir formattadır.
Ama saniyede milyonlarca cihazdan aktığında, bunu yakalamak ve işlemek için Kafka, Spark
Streaming gibi teknolojilere ihtiyaç duyulur.

Zaten büyük verinin doğuş hikayesi de bunu doğrular. Google'ın Bigtable makalesi ya da
Apache Hadoop (HDFS + MapReduce), video-ses işlemek için değil; geleneksel veritabanlarının
(Oracle, SQL Server, MySQL) tek bir sunucunun diski ve RAM'iyle sınırlı kalıp **dikey
büyüyememesi** sorununu çözmek için çıktı. Sadece structured data olsaydı bile, yatayda
binlerce ucuz sunucuyu birbirine bağlama ihtiyacı yine doğacaktı. Bugün Hive, Presto,
Snowflake, BigQuery gibi milyarlarca dolarlık teknolojiler, temelde **yapılandırılmış
veriyi** devasa ölçeklerde hızlı sorgulamak için tasarlanmıştır.

> Verinin "düzenli" olması, onun devasa bir ölçekte ve baş döndürücü bir hızda aktığı
> gerçeğini değiştirmez. Variety az olsa bile, Volume ve Velocity geleneksel yöntemleri
> çökerttiği anda büyük veriden söz ederiz.

## Tek bir veri türü bile başlı başına bir dünya olabilir

Birinci yanılgının bir uzantısı da şu: büyük veriyi genellikle **tek bir "gösterişli" veri
türüyle** özdeşleştiririz. Bir kurumdan büyük veri diye söz edilirken çoğu zaman dışarıya en
kolay anlatılan, en "havalı" tek bir kaynak öne çıkarılır — sanki büyük veri o tek şeyden
ibaretmiş gibi. Oysa iki ayrı yanılsama var burada.

**Birincisi:** öne çıkarılan o tek tür bile, tek başına devasa bir büyük veri dünyası
olabilir. Görünüşte "basit" bir sinyal düşünün — bir araç filosunun anlık konum bilgisi ya
da bir uygulamadaki tıklama akışı. Ham haliyle `[Kimlik, Zaman, Değer]` kadar sade ve
yapılandırılmıştır. Ama milyonlarca kaynaktan saniye saniye akınca, bu tek "tür" bile
zaman-mekân matrisleri, davranış profilleri, anlık yoğunluk haritaları gibi katman katman
analize dönüşür ve tek bir veritabanının kaldıramayacağı bir hacme ulaşır. Yani "tek bir tür
veri" küçük olmak zorunda değildir; kendi başına bir büyük veri ambarı hâline gelebilir.

**İkincisi:** dışarıya anlatılan o gösterişli tür, genellikle buzdağının sadece görünen
yüzüdür. Bir sistemin büyük veri altyapısını asıl eriten şey, kimsenin sunumlarda övünerek
anlatmadığı o **"makine egzozudur"**: uygulama logları, sistemler arası event'ler, tıklama
akışları, sensör telemetrisi, hata kayıtları, denetim (audit) izleri. Tek tek bakınca hiçbiri
"havalı" değildir; ama milyonlarca kullanıcı ve cihazla çarpılınca asıl veri dağını bunlar
oluşturur. Kurumun gururla gösterdiği veri türü çoğu zaman bütünün küçük, cilalı bir
parçasıdır — akan verinin asıl kütlesi arka planda, sessizce birikir.

Buradan çıkan ders, birinci yanılgıyı pekiştirir: bir veriyi "büyük" yapan onun ne olduğu
(tipi, gösterişi, tek mi çok mu tür olduğu) değil; ne kadar ve ne hızla aktığıdır.

## Yanılgı 2: "Büyük veri, büyük şirketin verisidir"

Buradan doğal bir soru çıkıyor: madem hacim önemli, o zaman küçük bir sigorta şirketinin
verisi "normal", çok daha büyük bir sigortanınki "büyük veri" mi sayılır? Çizgiyi şirket
ölçeğine göre mi çekiyoruz?

Hayır. Çizgiyi çeken şey şirketin büyüklüğü değil, **verinin doğası** ve o veriyi işlemek için
**yapısal olarak teknolojiyi değiştirmek zorunda kalıp kalmadığınızdır.**

En somut teknik çizgi şudur: elinizdeki veriyi **tek bir güçlü sunucuya** (SQL Server,
Oracle, PostgreSQL) yükleyip, RAM'ini ve işlemcisini artırarak (**vertical scaling**) makul
sürede sorgulayabiliyorsanız, o veri ne kadar büyük olursa olsun geleneksel veridir. Ne zaman
ki o veri tek makinenin sınırlarını aşar — diske sığmaz, RAM yetmez — ve veriyi mecburen
parçalara bölüp **birden fazla makineden oluşan bir kümede (dağıtık mimari)** işlemek zorunda
kalırsınız, işte o an çizgiyi geçmiş olursunuz.

Sigorta örneğiyle somutlaştıralım. Türkiye'nin en büyük sigortası olsun; milyonlarca
müşteri, poliçe, hasar kaydı.

- **Hâlâ "normal" veri:** 20 yıllık tüm poliçe geçmişi, müşteri ve finansal kayıtları
  yapılandırılmış tablolarda duruyor ve toplamı diyelim 2–3 TB. Bu, iyi konfigüre edilmiş tek
  bir Oracle/MSSQL'de rahat döner. Veri "büyük"tür ama teknolojik olarak Big Data değil,
  klasik bir **veri ambarı (Data Warehouse)** konusudur.
- **Çizgiyi geçtiği an:** Aynı şirket iş yapış şeklini değiştirip müşteri araçlarına cihaz
  takar ve sürüş alışkanlıklarını (anlık hız, sert fren, viraj, lokasyon) saniye saniye
  toplayıp kişiye özel kasko fiyatı çıkarmaya kalkarsa — milyonlarca araçtan akan telemetri
  anında bir Volume ve Velocity patlaması yaratır. Ya da kazalardan gelen milyonlarca yüksek
  çözünürlüklü hasar fotoğrafını, video ve ses kaydını yapay zekayla analiz etmeye başlarsa
  (Variety) çizgi çoktan geçilmiştir.

Kendi verinizin çizginin neresinde olduğunu üç soruyla test edebilirsiniz:

| Kriter | Geleneksel Veri (Küçük/Orta) | Büyük Veri (Big Data) |
| --- | --- | --- |
| **Nasıl saklıyorum?** | Tek bir veritabanı sunucusunda (RDBMS) | Dağıtık dosya sistemlerinde (HDFS, S3) veya NoSQL'de |
| **Nasıl sorguluyorum?** | Standart SQL + indeks, birkaç saniyede | Dağıtık motorlarla (Spark, Presto) paralel işleyerek |
| **Ne hızla büyüyor?** | Aylık/yıllık, tahmin edilebilir, lineer | Saniyeler içinde, loglarla/sensörlerle, eksponansiyel |

> Çizgi niceliksel bir boyut değil ("5 TB'dan sonrası büyüktür" gibi bir eşik yoktur),
> **niteliksel bir mimari değişimidir.** Elinizdeki klasik araçlar verinin altında ezilmeye
> başladığı an, büyük veri çizgisine çarpmışsınız demektir.

## Yanılgı 3: "Real-time olan her şey büyük veridir"

Bu ikisi sunumlarda hep yan yana anılır, sanki eşanlamlıymış gibi. Oysa bir verinin
**real-time** (gerçek zamanlı) olması ile **big data** olması teknik olarak tamamen farklı
iki boyuttur. Biri "hız ve mimari" tercihidir, diğeri "ölçek ve hacim" sorunu.

İkisi ayrı eksen olduğu için işi bir matrise dökmek en açıklayıcısı:

| | Geleneksel / Küçük Veri | Büyük Veri |
| --- | --- | --- |
| **Batch (toplu/gecikmeli)** | Ufak bir e-ticaretin dün geceki satışlarını sabah raporlaması | Bir bankanın 10 yıllık kart harcamasını her gece Spark ile tarayıp risk analizi |
| **Real-time (anlık)** | Kurye takip, borsa fiyat ekranı, canlı chat | Netflix'in milyonlarca izleyicinin anlık tıklamasıyla ana sayfayı kişiselleştirmesi |

Sağ alt köşe, iki kavramın çakıştığı yerdir — ve zihinlerde ikisini yapıştıran da odur. Ama
sol alt köşe, büyük veri **olmadan** da real-time'ın mümkün olduğunu gösterir. Çünkü
real-time'ın kalbi verinin boyutunda değil, işlenme **gecikmesindedir (latency)**:

- **Borsa / kripto fiyatı:** Akan tek şey `[Hisse, Fiyat, Zaman]`. Satır hafiftir; ama fiyatı
  milisaniyede ekrana yansıtmak zorundasınız. Real-time'dır — ama arkada bir Hadoop cluster'ı
  gerektirmez; hafif bir WebSocket + Redis/MQTT kuyruğu işi çözer.
- **Akıllı termostat (IoT):** Sıcaklığı ölçer, gönderir, sunucu "kombiyi kapat" der. Saniyede
  birkaç bayt. Tamamen real-time, ama ortada büyük veri yok.
- **Canlı chat:** İki kişi mesajlaşırken veri milisaniyede iletilmeli (real-time), ama taşınan
  şey birkaç kilobaytlık düz metin.

Peki neden bu kadar sık beraber anılıyorlar? İki haklı sebep var. Birincisi, büyük verinin
**en değerli hali** artık real-time'dır: eskiden büyük veri sadece "dün ne oldu?" diye
işlenirdi; bugün kredi kartı dolandırıcılığını engellemek için, geçmişteki petabaytlarca
veriden beslenen model tam kart çekildiği o **1 saniye içinde** çalışmak zorunda. İkincisi,
kullanılan araçlar ortak: Kafka, Flink, Spark Streaming hem saniyede 10 satırı hem de saniyede
10 milyon satırı taşımak için kullanılabilir. Ama aynı aracı kullanmak, iki problemin aynı
olduğu anlamına gelmez.

> Ufak ve hızlı akan bir dere de real-time'dır (küçük veri), tsunami gibi devasa ve hızlı
> akan bir okyanus da (büyük veri). Real-time, akışın **hızıyla**; big data, akışın
> **büyüklüğüyle** ilgilidir.

## O zaman çizgiyi asıl çeken ne: araçlar

Üç yanılgıyı da (format, şirket boyutu, real-time) yıktığımızda geriye tek bir sağlam ölçüt
kalıyor: **elimizdeki araçlar verinin altında eziliyor mu, ezilmiyor mu?** O yüzden asıl
ayrımı araçların mimarisinde aramak gerekir. Geleneksel araçlarla büyük veri araçlarını
birbirinden ayıran felsefe tek cümlede şudur: *veriyi tek bir güçlü merkezde mi işliyoruz,
yoksa parçalayıp bir bilgisayar ordusuna mı dağıtıyoruz?*

**Mimari: Scale-Up vs. Scale-Out.** Geleneksel araçlar (RDBMS) tek bir sunucunun sınırları
içinde çalışır; veri büyüyünce o sunucuya daha çok RAM/CPU takarsınız (**dikey büyüme**) —
ve bir noktada donanımın fiziksel sınırına, astronomik maliyetlere çarparsınız. Büyük veri
araçları ise **dağıtık mimari** üzerine kuruludur: iş yükünü, "cluster" denen ve birbirine
ağla bağlı yüzlerce ucuz makineye dağıtırlar. Veri mi büyüdü? Sunucuyu güçlendirmezsiniz,
kümeye birkaç ucuz makine daha eklersiniz (**yatay büyüme**).

**Depolama.** Geleneksel taraf, veriyi katı kuralları olan, önceden tanımlı şemaya bağlı
(**schema-on-write**) tablolarda tutar. Büyük veri tarafı, veriyi ham haliyle kabul eden
**dağıtık dosya sistemleri** (HDFS, S3, GCS) kullanır; veri bloklara bölünüp kümedeki farklı
makinelere dağıtılır ve kaybolmasın diye kopyalanır (**replication**). Şema, veriyi yazarken
değil **okurken** giydirilir (**schema-on-read**).

**İşleme.** Geleneksel sistemde işlem veriye gider: tek motor sorguyu koşturur. Büyük veride
tersine, **işlem (kod) verinin durduğu makineye gönderilir** (data locality) ve sorgu 100
parçaya bölünüp 100 makinede aynı anda çalışır (MapReduce / MPP), sonuçlar birleşir.

| Özellik | Geleneksel (RDBMS / DWH) | Büyük Veri (Big Data) |
| --- | --- | --- |
| **Teknolojiler** | Oracle, SQL Server, PostgreSQL, Teradata | Hadoop, Spark, Kafka, Flink, Cassandra, ClickHouse |
| **Veri yapısı** | Yalnızca structured (satır/sütun) | Structured + semi-structured + unstructured |
| **Sorgu** | Tek motor koşturur | Sorgu bölünür, onlarca makinede paralel |
| **Şema** | Schema-on-write (önce şema) | Schema-on-read (önce veri) |
| **Ölçekleme** | Dikey (daha güçlü makine) | Yatay (kümeye makine ekle) |

Çizgiyi net gösteren tek bir e-ticaret senaryosu bu ayrımı somutlaştırıyor:

- **Geleneksel araç işi:** Kullanıcı "Satın Al"a bastı. Sepet hesaplanacak, stoktan
  düşülecek, faturaya yazılacak. Bu işlem **ACID** (kesin tutarlılık) ister; bir kuruş bile
  şaşmamalı. Buranın kralı PostgreSQL ya da Oracle'dır — dağıtık sistemin karmaşasına hiç
  gerek yok.
- **Büyük veri işi:** Aynı sitede o an gezinen 1 milyon kullanıcının mouse hareketini, hangi
  ürüne kaç saniye baktığını anlık loglamak isteyin (öneri motoru için). Saniyede milyarlarca
  log akar. Bunu geleneksel bir SQL veritabanına saniyede milyonlarca `INSERT` ile basmaya
  kalkarsanız veritabanı kilitlenir. İşte logları toplamak için **Kafka**, anlık işlemek için
  **Spark** tam burada devreye girer.

## Özet: çizgi bir eşik değil, bir kırılma

Başta üç yanılgı vardı; üçü de yıkıldı. Büyük veri **unstructured olmak zorunda değil** —
sadece structured veri de Volume ve Velocity ile büyük veri olur. Büyük veri **büyük şirketin
tekelinde değil** — çizgiyi ciro değil, verinin doğası çizer. Ve büyük veri **real-time ile
eşanlamlı değil** — küçük veri de real-time akabilir.

Geriye kalan tek gerçek ölçüt şu: elinizdeki geleneksel araçlar (klasik ilişkisel
veritabanları) verinin hacmi ya da hızı altında ezilmeye başladığı, sizi veriyi parçalayıp
bir makine kümesine dağıtmaya mecbur bıraktığı an — işte tam o an büyük veri çizgisini
geçmişsinizdir. Gösterişli tek bir veri türünü arka plandaki makine egzozundan ayıran da,
küçük bir sigortayla dev sigortayı ayıran da, bir borsa ekranını Netflix'ten ayıran da hep
aynı soru: **bu veriyi tek bir makine hâlâ taşıyabiliyor mu?**
