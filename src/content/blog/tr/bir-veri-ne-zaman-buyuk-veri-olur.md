---
title: 'Büyük Veri Nerede Başlar? Üç Yanılgı, Tek Ölçüt'
description: 'Büyük veri ne "unstructured veri" demektir, ne "büyük şirketin verisi", ne de "real-time sistem". Peki yalnızca structured veriyle büyük veri olur mu? Vitrine çıkarılan veriyle arka planda asıl akan veri arasındaki fark ne? Real-time için büyük veri şart mı? Bu yazı üç yaygın yanılgıyı tek tek ele alıyor ve çizgiyi asıl çeken ölçütü — geleneksel araçlarla büyük veri araçlarını ayıran mimari farkı — baştan kuruyor.'
pubDate: 2026-07-09
tags: ['Büyük Veri', 'Dağıtık Sistemler', 'Ölçekleme', 'Real-Time', 'Veri Mühendisliği', 'Backend']
draft: false
---

"Büyük veri" kavramı günlük konuşmada neredeyse her zaman yanlış bir çağrışımla
dolaşır. Kimine göre ses kayıtları, videolar ve sosyal medya paylaşımlarından oluşan
**unstructured** (yapılandırılmamış) bir yığındır. Kimine göre **büyük şirketlerin**
elindeki veridir — küçük bir firmanınki "normal", devasa bir kurumunki "büyük" sayılır.
Bir başkasına göreyse **real-time** (gerçek zamanlı) akan her şey büyük veridir.

Üçü de yanlış. Daha doğrusu, üçü de büyük verinin kenarına dokunur ama asıl çizgiyi
ıskalar. Bu yazı, bu üç yanılgıyı sırayla ele alıp geriye kalan gerçek ölçütü — bir
verinin ne zaman "büyük veri" sayıldığını — baştan kuruyor.

## Yanılgı 1: "Büyük veri, unstructured veridir"

En yaygın kısayol bu: büyük veri deyince akla ses, görüntü, log, tweet gelir. Peki
ortada **yalnızca structured (yapılandırılmış) veri** olsaydı büyük veriden söz
edilebilir miydi?

**Kesinlikle edilebilirdi.** Verinin düzenli satır-sütun formatında olması, "büyük"
olmasına engel değildir. Büyük veriyi tanımlarken bakılan şey verinin **tipi** değil,
bilinen **3V** ölçütüdür: Volume (hacim), Velocity (hız) ve Variety (çeşitlilik).
Çeşitlilik yapılandırılmış veriyle sınırlı kalsa bile, diğer iki unsur büyük veri
oluşturmaya fazlasıyla yeter.

**Volume (Hacim).** Yapılandırılmış bir veritabanı, tek bir sunucunun rahatça
taşıyamayacağı boyuta ulaştığında o veri büyüktür — bu bazen petabaytlar, bazen
yalnızca terabaytlar demektir; kesin bir eşik yoktur. Küresel bir bankanın tüm kredi
kartı işlem geçmişi ya da bir havayolunun anlık rezervasyon ve uçuş verisi, ilişkisel
veritabanlarında (RDBMS) tertemiz SQL formatında durur. Ama boyut tek makinenin
sınırını aşınca geleneksel sunucu bu yükü kaldıramaz olur. Yapılandırılmış büyük veri
tam burada başlar.

**Velocity (Hız).** Veri çok yüksek hızla akıp milisaniyeler içinde işlenmek zorunda
kaldığında, yapısı ne kadar düzenli olursa olsun ortaya bir büyük veri problemi çıkar.
IoT cihazlarından, akıllı sayaçlardan ya da araç sensörlerinden akan telemetri
genellikle `[Cihaz_ID, Zaman_Damgası, Sıcaklık, Voltaj]` gibi son derece
yapılandırılmış bir formattadır. Ama saniyede milyonlarca cihazdan aktığında, onu
yakalayıp işlemek için Kafka ve Spark Streaming gibi teknolojiler gerekir.

Büyük verinin doğuş hikâyesi de bunu doğrular. Google'ın Bigtable makalesi ve Apache
Hadoop (HDFS + MapReduce), video-ses işlemek için değil; geleneksel veritabanlarının
(Oracle, SQL Server, MySQL) tek bir sunucunun diski ve RAM'iyle sınırlı kalıp **dikey
büyüyememesi** sorununu çözmek için ortaya çıktı. Ortada yalnızca structured veri
olsaydı bile, yatayda binlerce ucuz sunucuyu birbirine bağlama ihtiyacı yine doğacaktı.
Bugün Hive, Presto, Snowflake ve BigQuery gibi milyarlarca dolarlık teknolojiler,
temelde **yapılandırılmış veriyi** devasa ölçekte hızlı sorgulamak için tasarlanmıştır.

> Verinin "düzenli" olması, devasa bir ölçekte ve baş döndürücü bir hızda aktığı
> gerçeğini değiştirmez. Variety düşük olsa bile, Volume ve Velocity geleneksel
> yöntemleri çökerttiği anda büyük veriden söz ederiz.

## Tek bir veri türü bile başlı başına bir dünya olabilir

Birinci yanılgının bir uzantısı daha var: büyük veriyi çoğu zaman **tek bir "gösterişli"
veri türüyle** özdeşleştiririz. Bir kurumun büyük verisinden söz edilirken genellikle
dışarıya en kolay anlatılan, en çarpıcı tek kaynak öne çıkarılır — sanki büyük veri o
tek şeyden ibaretmiş gibi. Oysa burada iki ayrı yanılsama iç içedir.

**Birincisi:** öne çıkarılan o tek tür bile, kendi başına devasa bir büyük veri dünyası
olabilir. Görünüşte "basit" bir sinyal düşünün — bir araç filosunun anlık konumu ya da
bir uygulamadaki tıklama akışı. Ham haliyle `[Kimlik, Zaman, Değer]` kadar sade ve
yapılandırılmıştır. Ama milyonlarca kaynaktan saniye saniye akmaya başlayınca, bu tek
"tür" bile zaman-mekân matrislerine, davranış profillerine, anlık yoğunluk haritalarına
— katman katman analize — dönüşür ve tek bir veritabanının taşıyamayacağı bir hacme
ulaşır. Yani "tek tür veri" küçük olmak zorunda değildir; kendi başına bir büyük veri
ambarına dönüşebilir.

**İkincisi:** dışarıya anlatılan o gösterişli tür, çoğu zaman buzdağının yalnızca
görünen yüzüdür. Bir sistemin büyük veri altyapısını asıl zorlayan şey, kimsenin
sunumlarda övünerek anlatmadığı **"makine egzozudur"**: uygulama logları, sistemler
arası event'ler, tıklama akışları, sensör telemetrisi, hata kayıtları, denetim (audit)
izleri. Tek tek bakıldığında hiçbiri etkileyici değildir; ama milyonlarca kullanıcı ve
cihazla çarpıldığında asıl veri dağını bunlar oluşturur. Kurumun gururla gösterdiği veri
türü genellikle bütünün küçük, cilalı bir parçasıdır — akan verinin asıl kütlesi arka
planda sessizce birikir.

Buradan çıkan ders, birinci yanılgıyı pekiştirir: bir veriyi "büyük" yapan ne olduğu
(tipi, gösterişi, tek mi çok mu tür olduğu) değil; ne kadar ve ne hızla aktığıdır.

## Yanılgı 2: "Büyük veri, büyük şirketin verisidir"

Buradan doğal bir soru doğuyor: madem hacim önemli, küçük bir sigorta şirketinin verisi
"normal", çok daha büyük bir sigortanınki "büyük veri" mi sayılır? Çizgiyi şirket
ölçeğine göre mi çekiyoruz?

Hayır. Çizgiyi çeken şey şirketin büyüklüğü değil, **verinin doğası** ve o veriyi
işlemek için **teknolojiyi yapısal olarak değiştirmek zorunda kalıp kalmadığınızdır.**

En somut teknik çizgi şudur: elinizdeki veriyi **tek bir güçlü sunucuya** (SQL Server,
Oracle, PostgreSQL) yükleyip RAM ve işlemci ekleyerek (**vertical scaling**) makul
sürede sorgulayabiliyorsanız, o veri ne kadar hacimli olursa olsun geleneksel veridir.
Ne zaman ki tek makinenin sınırlarını aşar — diske sığmaz, RAM yetmez — ve veriyi
mecburen parçalara bölüp **birden fazla makineden oluşan bir kümede (dağıtık mimari)**
işlemek zorunda kalırsınız, işte o an çizgiyi geçmişsinizdir.

Sigorta örneğiyle somutlaştıralım. Türkiye'nin en büyük sigortası olsun; milyonlarca
müşteri, poliçe, hasar kaydı.

- **Hâlâ "normal" veri:** 20 yıllık tüm poliçe geçmişi, müşteri ve finansal kayıtlar
  yapılandırılmış tablolarda duruyor ve toplamı diyelim 2–3 TB. Bu, iyi konfigüre
  edilmiş tek bir Oracle/MSSQL'de rahatça döner. Veri hacimlidir ama teknolojik olarak
  Big Data değil, klasik bir **veri ambarı (Data Warehouse)** konusudur.
- **Çizgiyi geçtiği an:** Aynı şirket iş yapış şeklini değiştirip müşteri araçlarına
  cihaz takar ve sürüş alışkanlıklarını (anlık hız, sert fren, viraj, lokasyon) saniye
  saniye toplayıp kişiye özel kasko fiyatı çıkarmaya başlarsa — milyonlarca araçtan
  akan telemetri, hacmi ve hızı bir anda katlar. Ya da kazalardan gelen milyonlarca
  yüksek çözünürlüklü hasar fotoğrafını, video ve ses kaydını yapay zekâyla analiz
  etmeye başlarsa (Variety), çizgi çoktan geçilmiştir.

Kendi verinizin çizginin neresinde durduğunu üç soruyla test edebilirsiniz:

| Kriter | Geleneksel Veri (Küçük/Orta) | Büyük Veri (Big Data) |
| --- | --- | --- |
| **Nasıl saklıyorum?** | Tek bir veritabanı sunucusunda (RDBMS) | Dağıtık dosya sistemlerinde (HDFS, S3) veya NoSQL'de |
| **Nasıl sorguluyorum?** | Standart SQL + indeks, birkaç saniyede | Dağıtık motorlarla (Spark, Presto) paralel işleyerek |
| **Ne hızla büyüyor?** | Aylık/yıllık, tahmin edilebilir, lineer | Saniyeler içinde, loglarla/sensörlerle, eksponansiyel |

> Çizgi niceliksel bir boyut değildir ("5 TB'dan sonrası büyüktür" gibi bir eşik
> yoktur); **niteliksel bir mimari değişimidir.** Klasik araçlarınız verinin altında
> ezilmeye başladığı an, büyük veri çizgisine varmışsınız demektir.

## Yanılgı 3: "Real-time olan her şey büyük veridir"

Bu ikisi sunumlarda hep yan yana anılır, sanki eşanlamlıymış gibi. Oysa bir verinin
**real-time** (gerçek zamanlı) olması ile **big data** olması teknik olarak birbirinden
tamamen bağımsız iki boyuttur. Biri "hız ve mimari" tercihidir, diğeri "ölçek ve hacim"
sorunu.

İki ayrı eksen söz konusu olduğu için en açıklayıcı yol, işi bir matrise dökmek:

| | Geleneksel / Küçük Veri | Büyük Veri |
| --- | --- | --- |
| **Batch (toplu/gecikmeli)** | Ufak bir e-ticaretin dün geceki satışlarını sabah raporlaması | Bir bankanın 10 yıllık kart harcamasını her gece Spark ile tarayıp risk analizi |
| **Real-time (anlık)** | Kurye takip, borsa fiyat ekranı, canlı chat | Netflix'in milyonlarca izleyicinin anlık tıklamasıyla ana sayfayı kişiselleştirmesi |

Sağ alt köşe, iki kavramın kesiştiği yerdir — zihinlerde ikisini birbirine yapıştıran
da odur. Ama sol alt köşe, büyük veri **olmadan** da real-time'ın mümkün olduğunu
gösterir. Çünkü real-time'ın özü verinin boyutunda değil, işlenme **gecikmesindedir
(latency)**:

- **Borsa / kripto fiyatı:** Akan tek şey `[Hisse, Fiyat, Zaman]`. Satır hafiftir; ama
  fiyatı milisaniyeler içinde ekrana yansıtmak zorundasınız. Real-time'dır — ama arkada
  bir Hadoop cluster'ı gerektirmez; hafif bir WebSocket + Redis/MQTT kuyruğu yeterlidir.
- **Akıllı termostat (IoT):** Sıcaklığı ölçer, gönderir; sunucu "kombiyi kapat" der.
  Saniyede birkaç bayt. Tamamen real-time, ama ortada büyük veri yok.
- **Canlı chat:** İki kişi mesajlaşırken veri milisaniyeler içinde iletilmelidir
  (real-time), ama taşınan şey birkaç kilobaytlık düz metindir.

Peki neden bu kadar sık birlikte anılıyorlar? İki haklı sebep var. Birincisi, büyük
verinin **en değerli hali** artık real-time: eskiden büyük veri yalnızca "dün ne oldu?"
sorusu için işlenirdi; bugün kredi kartı dolandırıcılığını engellemek için, geçmişteki
petabaytlarca veriden beslenen modelin kart çekildiği o **1 saniye içinde** çalışması
gerekiyor. İkincisi, kullanılan araçlar ortak: Kafka, Flink ve Spark Streaming saniyede
10 satırı da taşıyabilir, 10 milyon satırı da. Ama aynı aracı kullanmak, iki problemin
aynı olduğu anlamına gelmez.

> Hızlı akan küçük bir dere de real-time'dır (küçük veri), aynı hızla akan bir okyanus
> da (büyük veri). Real-time akışın **hızıyla**, big data akışın **büyüklüğüyle**
> ilgilidir.

## O zaman çizgiyi asıl çeken ne: araçlar

Üç yanılgı da (format, şirket boyutu, real-time) elendiğinde geriye tek bir sağlam
ölçüt kalıyor: **elimizdeki araçlar verinin altında eziliyor mu, ezilmiyor mu?** Bu
yüzden asıl ayrımı araçların mimarisinde aramak gerekir. Geleneksel araçlarla büyük
veri araçlarını ayıran felsefe tek cümledir: *veriyi tek bir güçlü merkezde mi
işliyoruz, yoksa parçalayıp bir bilgisayar ordusuna mı dağıtıyoruz?*

**Mimari: Scale-Up vs. Scale-Out.** Geleneksel araçlar (RDBMS) tek bir sunucunun
sınırları içinde çalışır; veri büyüdükçe o sunucuya daha fazla RAM/CPU eklersiniz
(**dikey büyüme**) — ve bir noktada donanımın fiziksel sınırına ve astronomik
maliyetlere çarparsınız. Büyük veri araçları ise **dağıtık mimari** üzerine kuruludur:
iş yükünü, "cluster" denen ve birbirine ağla bağlı yüzlerce ucuz makineye dağıtırlar.
Veri mi büyüdü? Sunucuyu güçlendirmek yerine kümeye birkaç ucuz makine daha eklersiniz
(**yatay büyüme**).

**Depolama.** Geleneksel taraf veriyi, katı kuralları olan ve önceden tanımlı şemaya
bağlı (**schema-on-write**) tablolarda tutar. Büyük veri tarafı ise veriyi ham haliyle
kabul eden **dağıtık dosya sistemleri** (HDFS, S3, GCS) kullanır; veri bloklara bölünüp
kümedeki farklı makinelere dağıtılır ve kaybolmaması için kopyalanır (**replication**).
Şema veriye yazarken değil, **okurken** giydirilir (**schema-on-read**).

**İşleme.** Geleneksel sistemde işlem veriye gider: tek motor sorguyu koşturur. Büyük
veride ise tersi olur — **işlem (kod), verinin durduğu makineye gönderilir** (data
locality); sorgu 100 parçaya bölünüp 100 makinede aynı anda çalışır (MapReduce / MPP)
ve sonuçlar birleştirilir.

| Özellik | Geleneksel (RDBMS / DWH) | Büyük Veri (Big Data) |
| --- | --- | --- |
| **Teknolojiler** | Oracle, SQL Server, PostgreSQL, Teradata | Hadoop, Spark, Kafka, Flink, Cassandra, ClickHouse |
| **Veri yapısı** | Yalnızca structured (satır/sütun) | Structured + semi-structured + unstructured |
| **Sorgu** | Tek motor koşturur | Sorgu bölünür, onlarca makinede paralel |
| **Şema** | Schema-on-write (önce şema) | Schema-on-read (önce veri) |
| **Ölçekleme** | Dikey (daha güçlü makine) | Yatay (kümeye makine ekle) |

Tek bir e-ticaret senaryosu bu ayrımı somutlaştırıyor:

- **Geleneksel araç işi:** Kullanıcı "Satın Al"a bastı. Sepet hesaplanacak, stoktan
  düşülecek, faturaya işlenecek. Bu işlem **ACID** (kesin tutarlılık) ister; bir kuruş
  bile şaşmamalıdır. Bu işin doğal adresi PostgreSQL ya da Oracle'dır — dağıtık
  sistemin karmaşasına gerek yoktur.
- **Büyük veri işi:** Aynı sitede o an gezinen 1 milyon kullanıcının mouse hareketini,
  hangi ürüne kaç saniye baktığını anlık loglamak isteyin (öneri motoru için). Saniyede
  milyarlarca log akar. Bunu geleneksel bir SQL veritabanına saniyede milyonlarca
  `INSERT` ile yazmaya kalkarsanız veritabanı kilitlenir. Logları toplamak için
  **Kafka**, anlık işlemek için **Spark** tam burada devreye girer.

## Peki büyük veri illa birden fazla bilgisayar mı demek?

Buraya kadar çizgiyi hep "tek makinenin sınırı" üzerinden çektik. Ama ince fakat önemli
bir düzeltme gerekiyor: **bir veriye büyük veri diyebilmek için onun illa birden fazla
bilgisayar (bir dağıtık sistem / cluster) tarafından işlenmesi şart değildir.** Çünkü
büyük veri **verinin kendi karakteristiğidir**; dağıtık sistemler ise o veriyi işlemek
için kullanılan **çözümlerden yalnızca biridir.** Bu ikisi çok sık birbirine
karıştırılır.

Peki tarihte neden hep yan yana yazıldılar? 2000'lerin başında tek bir bilgisayarın
işlemci (CPU) ve bellek (RAM) kapasitesi hem sınırlı hem çok pahalıydı. Veri hacmi bir
anda katlanınca şirketler bu devasa yükü tek makineye sığdıramadı — **scale-up
duvarına** çarptılar. Tam o noktada Google, **MapReduce** makalesiyle ve ardından
**Hadoop**, dünyaya şunu söyledi: *"Devasa tek bir bilgisayar almaya çalışmayın; 500
sıradan bilgisayarı birleştirip tek bir makine gibi çalıştırın"* (**scale-out**). Büyük
veri ile dağıtık sistemlerin adı bu yüzden tarihe birlikte geçti.

Ama bugünün donanımı o Hadoop döneminden çok farklı bir yerde. Artık tek bir sunucuya
(single node) terabaytlarca RAM, yüzlerce işlemci çekirdeği ve saniyede gigabaytlarca
okuyan NVMe SSD'ler koyulabiliyor. Bu şu demek: eskiden 50 bilgisayarlık bir Hadoop
cluster'ı kurularak çözülen ve "büyük veri" denen birçok problem, bugün tek bir güçlü
bulut sunucusunda — in-memory veritabanları ya da modern, optimize edilmiş execution
engine'lerle — üstelik ağ (network) gecikmesi olmadan çok daha hızlı işlenebiliyor.

Yani "tek makine sınırı" sabit bir duvar değil, **donanımla birlikte sürekli kayan bir
çizgidir.** Daha da önemlisi: bir veri tek makinenin belleğine sığıp orada
işlenebiliyor olsa bile, hâlâ son derece karmaşık, hızlı ve yapılandırılmamışsa o veri
**yine büyük veridir.** Araçlar amaca hizmet eder; mimariyi belirleyen, verinin
dayattığı zorunluluklardır — dağıtık sistem bu zorunlulukların en bilinen cevabıdır,
tanımı değil.

## Özet: çizgi bir eşik değil, bir kırılma

Başta üç yanılgı vardı; üçü de elendi. Büyük veri **unstructured olmak zorunda değil**
— yalnızca structured veri de Volume ve Velocity ile büyük veri olur. Büyük veri
**büyük şirketin tekelinde değil** — çizgiyi ciro değil, verinin doğası çizer. Ve büyük
veri **real-time ile eşanlamlı değil** — küçük veri de real-time akabilir.

Geriye kalan tek gerçek ölçüt şu: elinizdeki geleneksel araçlar (klasik ilişkisel
veritabanları) verinin hacmi, hızı ya da karmaşıklığı altında ezilmeye başladığı ve
sizi başka araçlara — ister dağıtık bir kümeye, ister tek ama devasa bir düğüme —
geçmeye mecbur bıraktığı an, büyük veri çizgisini geçmişsinizdir. Gösterişli tek bir
veri türünü arka plandaki makine egzozundan ayıran da, küçük bir şirketle dev bir
şirketi ayıran da, bir borsa ekranını Netflix'ten ayıran da hep aynı soru: **bu veriyi
tek bir makine hâlâ taşıyabiliyor mu?**
