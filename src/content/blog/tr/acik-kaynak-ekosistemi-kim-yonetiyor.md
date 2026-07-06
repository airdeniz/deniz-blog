---
title: 'Monolitten Gelen Biri İçin: Bu Araçlar Birbirini Nereden Tanıyor, Ekosistemi Kim Yönetiyor?'
description: 'Oracle gibi her şeyi tek çatı altında toplayan bir dünyadan gelince, açık kaynak araçlarının birbirine lego gibi oturması insana sihir gibi geliyor. Peki git PowerShell''de nasıl tanınıyor, pip install ne yapıyor, Airflow ile Spark hangi sözleşmeyle konuşuyor ve en önemlisi — bunları kim yönetiyor? Merkezde kimsenin olmadığı bir düzeni baştan kuran bir yazı.'
pubDate: 2026-07-06
tags: ['Açık Kaynak', 'PATH', 'CLI', 'Python', 'Ekosistem', 'Standartlar', 'Backend']
draft: false
---

Yıllarca Oracle gibi monolitik bir dünyada çalışan birinin kafasında belli bir refleks
oturur: veritabanı, ETL aracı (ODI), replikasyon (GoldenGate), raporlama (OBIEE)... hepsi
**tek bir şirketin** tasarladığı, birbirine önceden lehimlenmiş parçalardır. Entegrasyonu
şirket "yukarıdan" kurar; kullanıcı yalnızca kullanır. Bu dünyadan çıkıp modern yazılıma
bakınca kafa karışır: `git`, `docker`, `python`, `airflow`, `spark`... hepsi ayrı ayrı
şirketlerin, toplulukların ürünüdür. Ama sanki biri oturmuş hepsini birbirine bağlamış gibi
kusursuz çalışırlar.

Asıl merak edilen soru da tam burada başlar: **Windows'un `git`'ten haberi bile yokken,
PowerShell'e `git status` yazınca bu nasıl çalışıyor? Python `import airflow` deyince neyi
buluyor? Ve en can alıcısı: bunların birbirini tanımasına kim, ne zaman karar veriyor?**
Ortada bir "yazılım bakanlığı" mı var?

Kısa cevap: hayır, merkezde kimse yok. Uzun cevabı da bu yazıda, monolit refleksleriyle
kıyaslayarak baştan kuralım.

## 1. `git` PowerShell'de nereden tanınıyor? Cevap: PATH

İlk yanılgıyı en baştan yıkalım: **PowerShell `git` diye bir komutu tanımıyor.** cmd de,
bash da, zsh de tanımıyor. `git status` yazıldığında shell'in yaptığı şey aslında çok basit
bir sekreterlik:

1. "`git` diye çalıştırılabilir bir dosya var mı?" diye **PATH** adlı ortam değişkenindeki
   klasörleri soldan sağa sırayla tarar.
2. `C:\Program Files\Git\cmd\git.exe` gibi bir yerde bulunca o `.exe`'yi çalıştırır.
3. Yazılan argümanları (`status`) olduğu gibi ona paslar.

Yani Windows'un Git'e "adapte olması" diye bir şey yok. Git kurulduğunda **installer, Git'in
klasörünü PATH değişkenine ekler.** Hepsi bu. Docker Desktop kurulunca da aynısı olur.
PowerShell'de şu komut, bu listeyi olduğu gibi gösterir:

```powershell
$env:PATH -split ';'
```

Bu çıktının içinde Git de, Docker da, hatta bir Oracle client kuruluysa `sqlplus`'ın klasörü
de vardır — çünkü terminalde `sqlplus` yazınca çalışmasının sebebi de birebir aynı mekanizma.
Oracle client kurulurken kendi `bin` klasörünü PATH'e eklemiştir, o kadar.

### Oracle refleksiyle bir analoji

PATH'i, shell'in `ALL_OBJECTS`'i gibi düşünmek mümkün. `SELECT * FROM tablo` dendiğinde Oracle
nasıl önce mevcut şemada, sonra synonym'lerde, sonra public objelerde arıyorsa; shell de komutu
PATH'teki klasörlerde **soldan sağa arar ve ilk bulduğunu çalıştırır.**

Bu "ilk bulduğunu çalıştırma" davranışı, meşhur bir baş ağrısının da kaynağıdır: bir makinede
iki Python kuruluysa ve `python` yazınca "yanlış olan" açılıyorsa, sebep neredeyse her zaman
PATH'te o sürümün klasörünün önce gelmesidir. **PATH'te önde olan kazanır.**

### Peki bu "anlaşma" ne zaman yapıldı?

Hiç yapılmadı. Ortada imzalanmış bir mutabakat yok. Bu konvansiyon **Unix'ten (1970'ler)**
geliyor: komutlar diskte birer dosyadır, shell onları bir arama yolunda bulur. DOS bu mantığı
taklit etti, Windows DOS'tan devraldı, PowerShell de Windows'tan. Yani Git veya Docker, Windows
için özel bir "büyü" yapmaz; sadece işletim sisteminin **50 yıldır açık duran standart bir
kapısını** (PATH ve komut satırı konvansiyonlarını) kullanır.

Buradaki kilit fikir aklıda kalsın, çünkü ikinci bölümde aynısı tekrarlanacak: **entegrasyon
yok, sadece ortak bir konvansiyona uymak var.**

## 2. Python içinde Airflow, Spark nasıl "entegre" oluyor?

Burada da aynı zarafet var. **Python'ın kendisi Airflow'u ya da Spark'ı tanımıyor.** Python'ın
bildiği tek şey şu: `import x` dendiğinde `x`'i belirli klasörlerde aramak. Bu klasörlerin
listesine `sys.path` denir — kabaca **PATH'in Python versiyonu** olarak düşünülebilir.

`pip install pyspark` dendiğinde ne olur?

1. `pip`, **PyPI** denen merkezi bir depoya bağlanır (Oracle dünyasındaki bir repository gibi,
   ama halka açık ve herkesin paket yükleyebildiği).
2. Paketi indirip `site-packages` klasörüne koyar.
3. Artık `import pyspark` çalışır, çünkü o klasör `sys.path` içindedir.

Airflow'a Spark yeteneği eklemek de tıpatıp aynı: `apache-airflow-providers-apache-spark` diye
bir paket vardır, kurulunca Airflow onu `sys.path`'te bulur ve `SparkSubmitOperator` gibi hazır
bileşenler kullanıma hazır hale gelir.

### Asıl soru: bu paketler birbiriyle nasıl konuşuyor?

Paketi bulmak bir şey; ama farklı dillerde yazılmış iki aracın gerçekten **anlaşması** başka bir
şey. Airflow Python ile yazılmış, Spark ise çoğunlukla Scala/Java (JVM üzerinde çalışıyor).
Bunlar nasıl konuşuyor? Cevap tek bir kavramda düğümleniyor: **arayüz (API) sözleşmeleri.**

Her araç, "benimle konuşmak istiyorsan şu kurallara uy" diyen bir sözleşme yayınlar:

- **Spark** der ki: "Bana JVM üzerinden **Py4J** denen köprüyle bağlanırsan seninle konuşurum."
  PySpark, işte bu sözleşmeye uyan bir Python paketidir — arka planda Python ile Spark'ın Java
  sanal makinesi arasında mesaj taşır.
- **Kafka** der ki: "TCP üzerinden şu binary protokolle konuş." Bu sözleşmeye uyan bir sürü farklı
  istemci vardır: `kafka-python`, Java client, Go client, Rust client... Hepsi aynı protokolü
  konuştuğu için hepsi aynı Kafka'yla çalışır. Debezium gibi CDC araçları da veriyi Kafka'ya bu
  protokolle basar.
- **Airflow** der ki: "Bana bir `Operator` sınıfı yaz, `execute()` metodunu doldur, gerisini ben
  hallederim." Herkes bu çerçeveye uyarak kendi "provider"ını yazar.

Yani entegrasyon bir sihir değil; **herkesin uyduğu, önceden yayınlanmış açık sözleşmeler.** Bir
aracın diğerini "tanıması" demek, aslında o aracın diğerinin ilan ettiği sözleşmeye uyan bir kod
parçası yazması demek.

### Oracle dünyasından tanıdık bir örnek: Knowledge Module

Bu mantık aslında bir Oracle geliştiricisine hiç yabancı değil. ODI'daki **Knowledge Module**'leri
düşünün: ODI der ki "Şu adımları, şu template yapısında yazarsan, seni her mapping'de otomatik
çalıştırırım." Geliştirici de o çerçeveye uyan bir KM yazar, ODI onu tanır. **Airflow provider'ları
da tam olarak bu:** Airflow'un çizdiği çerçeveye uyan eklentiler. Fark şu ki ODI'de çerçeveyi Oracle
çizer; açık kaynakta çerçeveyi herkesin gördüğü, herkesin geliştirebildiği bir topluluk çizer.

Python'a bu yüzden **"tutkal dil" (glue language)** denir. Kendisi C ile yazılmıştır ama Java,
Scala, C++, Rust ile rahatça köprü kurabilir. Bu yüzden veri dünyasında farklı dillerdeki devasa
motorları birbirine bağlayan yapıştırıcı çoğu zaman Python olur.

## 3. Peki bütün bunları kim yönetiyor?

İşin en can alıcı yeri burası. Monolitten gelen biri sürekli **bir yönetici** arar: "Bu kadar araç
birbirine bu kadar iyi oturuyorsa, birileri masanın başında oturup karar veriyor olmalı." Ama öyle
değil. **Merkezî bir yönetici yok.** Onun yerine **katmanlı bir düzen** var:

- **Standart kuruluşları** en alttaki temeli döşer. TCP/IP ve HTTP protokolleri (IETF), POSIX (IEEE),
  Unicode, SQL standardı... Bunlar internetin ve işletim sistemlerinin ortak "veri tipleri" gibidir.
  Kimse bunları tek başına değiştiremez.
- **Vakıflar** büyük projeleri barındırır. **Apache Software Foundation** (Kafka, Spark, Airflow,
  Iceberg — modern bir veri stack'inin neredeyse tamamı!), Linux Foundation, Python Software
  Foundation... Bunlar kâr amacı gütmeyen, gönüllü ve şirket desteğiyle ayakta duran tarafsız
  yapılardır. Telif hakkını ve yönü onlar korur.
- **Şirketler** kendi ürünlerinin API'larını yayınlar ve **geriye dönük uyumluluğa** titizlikle özen
  gösterir. Çünkü bir API kırılırsa, o API'ya güvenen herkesin sistemi patlar ve kimse o aracı bir
  daha kullanmaz. Uyumluluk burada ticari bir zorunluluktur.
- **Fiili (de facto) standartlar** ise en yaygın olan kazanınca kendiliğinden oluşur. Git'i bir kurul
  seçmedi; sadece herkes kullandı ve rakiplerini eledi. JSON'u kimse "standart" ilan etmedi; o kadar
  pratikti ki standart oldu.

Yani düzen "yukarıdan aşağıya emirle" değil, **"aşağıdan yukarıya uyumla"** kurulur. Açık bir
sözleşmeye uyan araç ekosisteme dahil olur; uymayan kullanılmaz ve kaybolur.

## 4. Yeni bir teknoloji ekosisteme nasıl "kabul ediliyor"?

En kafa karıştıran kısım da burası: **Bugün yepyeni bir araç çıksa — mesela Iceberg ilk çıktığı
gün — Spark, Airflow, Trino gibi araçların onu tanımaya başlamasına kim, ne zaman karar veriyor?**
(Apache Iceberg gerçekten de 2018 civarı Netflix'in içinden çıkıp bugün sektör standardı oldu.)
Süreç, tam da yukarıdaki "merkezde kimse yok" fikrinin canlı bir örneği. Organik bir evrimle işler:

**Aşama 0 — Doğuş.** Büyük bir şirket (örneğin Netflix) mevcut araçlarla (eski Hive tablo formatı)
devasa bir sorun yaşar, kendi içinde bir çözüm geliştirir ve "biz bunu tek başımıza taşımayalım,
açık kaynak yapalım, hem herkes kullansın hem geliştirsin" deyip projeyi bir vakfa (ASF) devreder.

**Aşama 1 — İlk köprüleri mucit kendi atar.** Yeni teknoloji tutunmak istiyorsa, insanların zaten
kullandığı araçlarla konuşmak zorundadır. Bu yüzden Iceberg'i yazan çekirdek ekip, ilk iş olarak
**Spark ve Flink konnektörlerini bizzat kendisi yazar.** Ekosisteme ilk boru hattını yeni gelen
döşer, çünkü tutunmak ona lazımdır.

**Aşama 2 — Topluluk baskısı.** Başarı hikâyeleri yayılır ("Iceberg'e geçtik, maliyet düştü,
sorgular uçtu"). Bunu okuyan mühendisler Airflow'un GitHub'ında issue açar: "Iceberg'e geçtik ama
sizde ona özel bir operatör yok, ne zaman ekleyeceksiniz?" Talep birikir.

**Aşama 3 — Kararı iki güç veriyor.** Birincisi **gönüllü topluluk:** istekli bir geliştirici "benim
de buna ihtiyacım var" der, provider'ı yazar, Airflow maintainer'larına gönderir, onlar inceleyip
onaylar ve bir sonraki sürümde Iceberg resmî olarak tanınır. İkincisi — ve çoğu zaman daha güçlü
olanı — **ticari çıkar:** Databricks, Snowflake, AWS gibi devler müşterilerini elde tutmak için
popüler her yeni teknolojiyi desteklemek *zorundadır*. Snowflake müşterilerinin Iceberg istediğini
görünce kendi mühendislerine görev verir; rekabet, entegrasyonu inanılmaz hızlandırır. (Nitekim
Iceberg'in arkasındaki Tabular'ı Snowflake satın aldı.)

Kabaca bir kronoloji:

| Zaman | Ne oluyor? | Kim yapıyor? |
| --- | --- | --- |
| 0. ay | Teknoloji doğar, açık kaynak olur | Mucit şirket (ör. Netflix) |
| 1–6. ay | En popüler 1-2 araca ilk köprüler atılır | Çekirdek geliştiriciler |
| 6–12. ay | Başarı hikâyeleri yayılır, talep birikir | Sahadaki mühendisler |
| 12–24. ay | Yan araçlar (Airflow, Trino) resmî paket çıkarır | Topluluk + şirketler |
| ~3. yıl | Bulut devleri "tıkla-kur" servis yapar | AWS, Azure, GCP |

Bir teknolojinin doğup "yerel (native) olarak her yerde tanınır" hale gelmesi genelde **1-3 yıl**
sürer. Oracle'ın "bu yıl şu özelliği ekliyorum" dediği tek elden takvimin aksine, burada **iyi olan,
sorun çözen ve arkasına rüzgârı alan teknoloji, ekosistemi kendini tanımaya mecbur bırakır.**
Ekosistem de hayatta kalmak için o yeni legoyu içine alır.

## Özet: iki dünyanın kıyası

Monolit modelini bu yeni dünyaya çevirirken en çok işe yarayan çerçeve şu:

| Kriter | Oracle (Monolit) | Modern Açık Kaynak Stack |
| --- | --- | --- |
| **Kim tasarlıyor?** | Tek şirket, her katmanı kontrol eder | Kimse — katmanlı, dağıtık bir düzen |
| **Entegrasyon yönü** | Yukarıdan aşağı, önceden lehimli | Aşağıdan yukarı, açık sözleşmelere uyumla |
| **Parçalar** | Birbirine bağımlı, tek çatı | Bağımsız legolar, tek işi iyi yapar |
| **Yeni özellik** | Şirketin takvimine bağlı | İhtiyaç + topluluk + rekabet belirler |
| **Yönetim** | Merkezî (Oracle) | Standartlar, vakıflar, fiili konvansiyonlar |

Üç mekanizmayı tek cümlede toplarsak:

- **Shell komutları** (`git`, `docker`, `sqlplus`) = **PATH** + diskteki `.exe` dosyaları.
- **Python entegrasyonları** (Airflow, Spark) = **pip + `import`** mekanizması + **API sözleşmeleri**.
- **Yönetim** = merkezî bir patron değil; standartların, vakıfların ve fiili konvansiyonların karışımı.

Monolitten gelen biri için "her şey birbirine nasıl bu kadar entegre?" diye şaşırmak çok doğal. Ama
işin sırrı şu: **kimse bunları birbirine entegre etmedi.** Her araç, herkesin gördüğü açık bir kapı
(PATH), açık bir depo (PyPI) ve açık bir sözleşme (API) bıraktı. O legolar birleştirildiğinde aslında
yıllardır orada duran o kapılardan geçiliyor. Bir sonraki sefer `git status` yazıldığında ya da
`pip install` çalıştırıldığında, arkada dönen şeyin bir sihir değil, 50 yıllık bir konvansiyon olduğu
görülüyor.
