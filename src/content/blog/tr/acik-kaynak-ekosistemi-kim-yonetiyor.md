---
title: 'Merkezde Kimse Yok: Açık Kaynak Araçları Birbirini Nereden Tanıyor?'
description: 'Her şeyi tek çatı altında toplayan Oracle dünyasından gelince, açık kaynak araçlarının birbirine lego gibi oturması şaşırtıcıdır. git PowerShell''de nasıl tanınıyor, pip install gerçekte ne yapıyor, Airflow ile Spark hangi sözleşme üzerinden konuşuyor? Ve asıl soru: bu düzeni kim yönetiyor? Merkezinde kimsenin olmadığı bir düzenin nasıl işlediğini adım adım kuran bir yazı.'
pubDate: 2026-07-06
tags: ['Açık Kaynak', 'PATH', 'CLI', 'Python', 'Ekosistem', 'Standartlar', 'Backend']
draft: false
---

Yıllarını Oracle gibi monolitik bir dünyada geçiren birinde belli bir refleks oturur:
veritabanı, ETL aracı (ODI), replikasyon (GoldenGate), raporlama (OBIEE)... hepsi **tek
bir şirketin** tasarladığı, fabrikadan birbirine lehimlenmiş parçalardır. Entegrasyonu
şirket yukarıdan kurar; kullanıcıya yalnızca kullanmak düşer. Bu dünyadan çıkıp modern
yazılıma bakan biri haklı olarak şaşırır: `git`, `docker`, `python`, `airflow`,
`spark`... her biri ayrı bir şirketin ya da topluluğun ürünü. Yine de sanki biri hepsini
tek tek birbirine bağlamış gibi kusursuz çalışıyorlar.

Asıl soru da tam burada başlıyor: **Windows'un `git`'ten haberi bile yokken PowerShell'e
`git status` yazınca bu nasıl çalışıyor? Python `import airflow` deyince neyi buluyor?
Ve en önemlisi: bu araçların birbirini tanımasına kim, ne zaman karar veriyor?** Ortada
bir "yazılım bakanlığı" mı var?

Kısa cevap: hayır, merkezde kimse yok. Uzun cevabı bu yazıda, monolit refleksleriyle
karşılaştıra karşılaştıra baştan kuracağız.

## 1. `git` PowerShell'de nereden tanınıyor? Cevap: PATH

İlk yanılgıyı baştan düzeltelim: **PowerShell `git` diye bir komut tanımıyor.** cmd de
tanımıyor, bash de, zsh de. `git status` yazıldığında shell'in yaptığı iş, basit bir
sekreterlikten ibaret:

1. **PATH** adlı ortam değişkenindeki klasörleri soldan sağa tarayıp "`git` adında
   çalıştırılabilir bir dosya var mı?" diye bakar.
2. `C:\Program Files\Git\cmd\git.exe` gibi bir yerde bulunca o `.exe`'yi çalıştırır.
3. Yazılan argümanları (`status`) olduğu gibi ona iletir.

Yani Windows'un Git'e "adapte olması" diye bir şey yok. Git kurulurken **installer,
Git'in klasörünü PATH değişkenine ekler.** Hepsi bu. Docker Desktop kurulduğunda da
aynısı olur. PowerShell'de şu komut, bu listeyi olduğu gibi gösterir:

```powershell
$env:PATH -split ';'
```

Çıktının içinde Git de vardır, Docker da; makinede bir Oracle client kuruluysa
`sqlplus`'ın klasörü de. Çünkü terminalde `sqlplus` yazınca çalışmasının sebebi de
birebir aynı mekanizma: Oracle client kurulurken kendi `bin` klasörünü PATH'e
eklemiştir, o kadar.

### Oracle refleksiyle bir analoji

PATH'i, shell'in `ALL_OBJECTS`'i gibi düşünmek mümkün. `SELECT * FROM tablo`
dendiğinde Oracle nasıl önce mevcut şemaya, sonra synonym'lere, sonra public objelere
bakıyorsa; shell de komutu PATH'teki klasörlerde **soldan sağa arar ve ilk bulduğunu
çalıştırır.**

Bu "ilk bulduğunu çalıştır" davranışı, meşhur bir baş ağrısının da kaynağıdır: bir
makinede iki Python kuruluysa ve `python` yazınca yanlış olanı açılıyorsa, sebep
neredeyse her zaman o sürümün klasörünün PATH'te daha önde gelmesidir. **PATH'te önde
olan kazanır.**

### Peki bu "anlaşma" ne zaman yapıldı?

Hiçbir zaman. Ortada imzalanmış bir mutabakat yok. Bu konvansiyon **Unix'ten
(1970'ler)** geliyor: komutlar diskte birer dosyadır, shell onları bir arama yolu
üzerinde bulur. DOS bu mantığı taklit etti, Windows DOS'tan devraldı, PowerShell de
Windows'tan. Yani Git veya Docker, Windows için olağanüstü bir şey yapmıyor; işletim
sisteminin **50 yıldır açık duran standart bir kapısını** — PATH'i ve komut satırı
konvansiyonlarını — kullanıyor.

Buradaki kilit fikri aklınızda tutun, çünkü ikinci bölümde aynısıyla tekrar
karşılaşacağız: **ortada bir entegrasyon yok; ortak bir konvansiyona uyum var.**

## 2. Airflow ve Spark, Python'ın içine nasıl "entegre" oluyor?

Burada da aynı zarafet işliyor. **Python'ın kendisi ne Airflow'u tanır ne Spark'ı.**
Python'ın bildiği tek şey şudur: `import x` dendiğinde `x`'i belirli klasörlerde
aramak. Bu klasörlerin listesine `sys.path` denir — kabaca **PATH'in Python
karşılığı** sayılabilir.

`pip install pyspark` çalıştırıldığında olan şu:

1. `pip`, **PyPI** adlı merkezi depoya bağlanır (Oracle dünyasındaki bir repository
   gibi, ama halka açık ve herkesin paket yükleyebildiği bir depo).
2. Paketi indirip `site-packages` klasörüne yerleştirir.
3. Artık `import pyspark` çalışır, çünkü o klasör `sys.path` içindedir.

Airflow'a Spark yeteneği kazandırmak da tıpatıp böyle: `apache-airflow-providers-apache-spark`
adında bir paket vardır; kurulduğunda Airflow onu `sys.path` üzerinde bulur ve
`SparkSubmitOperator` gibi hazır bileşenler kullanıma açılır.

### Asıl soru: bu paketler birbiriyle nasıl konuşuyor?

Paketi bulmak bir şey; farklı dillerde yazılmış iki aracın gerçekten **anlaşması**
başka bir şey. Airflow Python ile yazılmış; Spark ise büyük ölçüde Scala/Java, yani
JVM üzerinde çalışıyor. Bunlar nasıl konuşuyor? Cevap tek bir kavramda toplanıyor:
**arayüz (API) sözleşmeleri.**

Her araç, "benimle konuşmak istiyorsan şu kurallara uy" diyen bir sözleşme yayınlar:

- **Spark** der ki: "Bana JVM üzerinden **Py4J** adlı köprüyle bağlanırsan seninle
  konuşurum." PySpark, tam olarak bu sözleşmeye uyan bir Python paketidir — arka
  planda Python ile Spark'ın Java sanal makinesi arasında mesaj taşır.
- **Kafka** der ki: "Benimle TCP üzerinden şu binary protokolle konuş." Bu sözleşmeye
  uyan pek çok istemci vardır: `kafka-python`, Java client, Go client, Rust client...
  Hepsi aynı protokolü konuştuğu için hepsi aynı Kafka'yla çalışır. Debezium gibi CDC
  araçları da veriyi Kafka'ya bu protokolle yazar.
- **Airflow** der ki: "Bana bir `Operator` sınıfı yaz, `execute()` metodunu doldur,
  gerisini ben hallederim." Herkes bu çerçeveye uyarak kendi "provider"ını yazar.

Yani entegrasyon esrarengiz bir şey değil; **önceden yayınlanmış ve herkesin uyduğu
açık sözleşmelerden ibaret.** Bir aracın diğerini "tanıması", aslında o aracın,
diğerinin ilan ettiği sözleşmeye uyan bir kod parçası yazması demek.

### Oracle dünyasından tanıdık bir örnek: Knowledge Module

Bu mantık bir Oracle geliştiricisine hiç yabancı değil. ODI'daki **Knowledge
Module**'leri düşünün: ODI, "şu adımları şu template yapısında yazarsan seni her
mapping'de otomatik çalıştırırım" der. Geliştirici de o çerçeveye uyan bir KM yazar ve
ODI onu tanır. **Airflow provider'ları da tam olarak budur:** Airflow'un çizdiği
çerçeveye uyan eklentiler. Tek fark şu: ODI'de çerçeveyi Oracle çizer; açık kaynakta
çerçeveyi herkesin görebildiği, herkesin katkı verebildiği bir topluluk çizer.

Python'a bu yüzden **"tutkal dil" (glue language)** denir. Kendisi C ile yazılmıştır
ama Java, Scala, C++ ve Rust ile rahatça köprü kurar. Veri dünyasında farklı
dillerdeki devasa motorları birbirine bağlayan yapıştırıcının çoğu zaman Python olması
bundandır.

## 3. Peki bütün bunları kim yönetiyor?

İşin en can alıcı yeri burası. Monolitten gelen biri gözüyle hep **bir yönetici**
arar: "Bu kadar araç birbirine bu kadar iyi oturuyorsa, birileri masanın başında
oturup karar veriyor olmalı." Oysa öyle değil. **Merkezî bir yönetici yok.** Onun
yerine **katmanlı bir düzen** var:

- **Standart kuruluşları** en alttaki temeli döşer. TCP/IP ve HTTP protokolleri
  (IETF), POSIX (IEEE), Unicode, SQL standardı... Bunlar internetin ve işletim
  sistemlerinin ortak "veri tipleri" gibidir. Kimse bunları tek başına değiştiremez.
- **Vakıflar** büyük projeleri barındırır. **Apache Software Foundation** (Kafka,
  Spark, Airflow, Iceberg — modern bir veri stack'inin neredeyse tamamı), Linux
  Foundation, Python Software Foundation... Kâr amacı gütmeyen, gönüllü emeği ve
  şirket desteğiyle ayakta duran bu tarafsız yapılar, projelerin telif hakkını ve
  yönünü korur.
- **Şirketler** kendi ürünlerinin API'larını yayınlar ve **geriye dönük uyumluluğu**
  titizlikle gözetir. Çünkü bir API kırıldığında ona güvenen herkesin sistemi çöker ve
  o aracı bir daha kimse kullanmaz. Uyumluluk burada ticari bir zorunluluktur.
- **Fiili (de facto) standartlar** ise en yaygın olan kazandığında kendiliğinden
  oluşur. Git'i bir kurul seçmedi; herkes kullandı ve rakiplerini eledi. JSON'u kimse
  "standart" ilan etmedi; o kadar pratikti ki standart oldu.

Yani düzen "yukarıdan aşağıya emirle" değil, **"aşağıdan yukarıya uyumla"** kurulur.
Açık bir sözleşmeye uyan araç ekosisteme katılır; uymayan kullanılmaz ve kaybolur.

## 4. Yeni bir teknoloji ekosisteme nasıl "kabul ediliyor"?

En kafa karıştıran kısım da burası: **Bugün yepyeni bir araç çıksa — mesela Iceberg'in
ilk çıktığı gün — Spark, Airflow, Trino gibi araçların onu tanımaya başlamasına kim,
ne zaman karar veriyor?** (Apache Iceberg gerçekten de 2018 civarında Netflix'in
içinden çıktı ve bugün sektör standardı hâline geldi.) Süreç, "merkezde kimse yok"
fikrinin canlı bir örneği ve organik bir evrimle ilerliyor:

**Aşama 0 — Doğuş.** Büyük bir şirket (örneğin Netflix) mevcut araçlarla (eski Hive
tablo formatı) devasa bir soruna toslar, kendi içinde bir çözüm geliştirir ve "bunu
tek başımıza taşımayalım; açık kaynak yapalım, herkes hem kullansın hem geliştirsin"
diyerek projeyi bir vakfa (ASF) devreder.

**Aşama 1 — İlk köprüleri mucit kendisi kurar.** Yeni bir teknoloji tutunmak
istiyorsa, insanların hâlihazırda kullandığı araçlarla konuşmak zorundadır. Bu yüzden
Iceberg'i yazan çekirdek ekip, ilk iş olarak **Spark ve Flink konnektörlerini bizzat
kendisi yazar.** Ekosisteme ilk boru hattını yeni gelen döşer; çünkü tutunmaya
ihtiyacı olan odur.

**Aşama 2 — Topluluk baskısı.** Başarı hikâyeleri yayılır ("Iceberg'e geçtik, maliyet
düştü, sorgular hızlandı"). Bunları okuyan mühendisler Airflow'un GitHub'ında issue
açar: "Iceberg'e geçtik ama sizde ona özel bir operatör yok, ne zaman ekleyeceksiniz?"
Talep birikir.

**Aşama 3 — Kararı iki güç verir.** Birincisi **gönüllü topluluk:** ihtiyacı olan bir
geliştirici provider'ı yazar, Airflow maintainer'larına gönderir; onlar inceleyip
onaylar ve bir sonraki sürümde Iceberg resmî olarak tanınır. İkincisi — ve çoğu zaman
daha güçlü olanı — **ticari çıkar:** Databricks, Snowflake, AWS gibi devler,
müşterilerini elde tutmak için popüler her yeni teknolojiyi desteklemek *zorundadır*.
Snowflake, müşterilerinin Iceberg istediğini görünce kendi mühendislerine görev verir;
rekabet, entegrasyonu olağanüstü hızlandırır. (Nitekim Iceberg'in arkasındaki
Tabular'ı Snowflake satın aldı.)

Kabaca bir kronoloji:

| Zaman | Ne oluyor? | Kim yapıyor? |
| --- | --- | --- |
| 0. ay | Teknoloji doğar, açık kaynak olur | Mucit şirket (ör. Netflix) |
| 1–6. ay | En popüler 1-2 araca ilk köprüler kurulur | Çekirdek geliştiriciler |
| 6–12. ay | Başarı hikâyeleri yayılır, talep birikir | Sahadaki mühendisler |
| 12–24. ay | Yan araçlar (Airflow, Trino) resmî paket çıkarır | Topluluk + şirketler |
| ~3. yıl | Bulut devleri "tıkla-kur" servis sunar | AWS, Azure, GCP |

Bir teknolojinin doğuşundan "her yerde native tanınır" hâle gelmesine kadar geçen
süre genelde **1-3 yıldır.** Oracle'ın "bu yıl şu özelliği ekliyorum" dediği tek elden
takvimin aksine, burada **iyi olan, sorun çözen ve arkasına rüzgârı alan teknoloji,
ekosistemi kendini tanımaya mecbur bırakır.** Ekosistem de hayatta kalmak için o yeni
legoyu bünyesine katar.

## Özet: iki dünyanın karşılaştırması

Monolit modelini bu yeni dünyaya çevirirken en çok işe yarayan çerçeve şu:

| Kriter | Oracle (Monolit) | Modern Açık Kaynak Stack |
| --- | --- | --- |
| **Kim tasarlıyor?** | Tek şirket, her katmanı kontrol eder | Kimse — katmanlı, dağıtık bir düzen |
| **Entegrasyon yönü** | Yukarıdan aşağı, önceden lehimli | Aşağıdan yukarı, açık sözleşmelere uyumla |
| **Parçalar** | Birbirine bağımlı, tek çatı | Bağımsız legolar, her biri tek işi iyi yapar |
| **Yeni özellik** | Şirketin takvimine bağlı | İhtiyaç + topluluk + rekabet belirler |
| **Yönetim** | Merkezî (Oracle) | Standartlar, vakıflar, fiili konvansiyonlar |

Üç mekanizmayı birer cümleye indirgersek:

- **Shell komutları** (`git`, `docker`, `sqlplus`) = **PATH** + diskteki `.exe`
  dosyaları.
- **Python entegrasyonları** (Airflow, Spark) = **pip + `import`** mekanizması +
  **API sözleşmeleri**.
- **Yönetim** = merkezî bir patron değil; standartların, vakıfların ve fiili
  konvansiyonların bileşimi.

Monolitten gelen birinin "her şey birbirine nasıl bu kadar entegre?" diye şaşırması
çok doğal. Ama işin sırrı şurada: **bunları kimse birbirine entegre etmedi.** Her
araç, herkesin görebildiği açık bir kapı (PATH), açık bir depo (PyPI) ve açık bir
sözleşme (API) bıraktı. Legolar birleştirildiğinde, aslında yıllardır orada duran o
kapılardan geçiliyor. Bir dahaki sefere `git status` yazdığınızda ya da `pip install`
çalıştırdığınızda, arkada dönenin esrarengiz bir şey değil, 50 yıllık bir konvansiyon
olduğunu bileceksiniz.
