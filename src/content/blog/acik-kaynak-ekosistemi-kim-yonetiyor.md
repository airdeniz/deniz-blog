---
title: 'Monolitten Gelen Biri İçin: git PowerShell''de Nereden Tanınıyor, Bu Ekosistemi Kim Yönetiyor?'
description: 'Oracle gibi her şeyi tek çatı altında toplayan bir dünyadan gelince, açık kaynak araçlarının birbirine lego gibi oturması insana sihir gibi geliyor. Peki git PowerShell''de nasıl tanınıyor, pip install ne yapıyor, Airflow ile Spark hangi sözleşmeyle konuşuyor ve en önemlisi — bunları kim yönetiyor? Merkezde kimsenin olmadığı bir düzeni baştan kuruyorum.'
pubDate: 2026-07-06
tags: ['Açık Kaynak', 'PATH', 'CLI', 'Python', 'Ekosistem', 'Standartlar', 'Backend']
draft: false
---

Yıllarca Oracle dünyasında çalışınca kafanda belli bir refleks oturuyor: veritabanı,
ETL aracı (ODI), replikasyon (GoldenGate), raporlama (OBIEE)... hepsi **tek bir şirketin**
tasarladığı, birbirine önceden lehimlenmiş parçalar. Entegrasyonu Oracle "yukarıdan"
kuruyor; sen sadece kullanıyorsun. Bu dünyadan çıkıp modern yazılıma bakınca insanın
kafası karışıyor: `git`, `docker`, `python`, `airflow`, `spark`... hepsi ayrı ayrı
şirketlerin, toplulukların ürünü. Ama sanki biri oturmuş hepsini birbirine bağlamış gibi
kusursuz çalışıyorlar.

Ben de tam bunu sordum kendime: **Windows'un `git`'ten haberi bile yokken, PowerShell'e
`git status` yazınca bu nasıl çalışıyor? Python `import airflow` deyince neyi buluyor?
Ve en can alıcısı: bunların birbirini tanımasına kim, ne zaman karar veriyor?** Ortada
bir "yazılım bakanlığı" mı var?

Kısa cevap: hayır, merkezde kimse yok. Uzun cevabı da bu yazıda, monolit reflekslerimle
kıyaslayarak baştan kuruyorum.

## 1. `git` PowerShell'de nereden tanınıyor? Cevap: PATH

İlk yanılgıyı en baştan yıkalım: **PowerShell `git` diye bir komutu tanımıyor.** cmd de,
bash da, zsh de tanımıyor. Sen `git status` yazdığında shell'in yaptığı şey aslında çok
basit bir sekreterlik:

1. "`git` diye çalıştırılabilir bir dosya var mı?" diye **PATH** adlı ortam değişkenindeki
   klasörleri soldan sağa sırayla tarar.
2. `C:\Program Files\Git\cmd\git.exe` gibi bir yerde bulunca o `.exe`'yi çalıştırır.
3. Senin yazdığın argümanları (`status`) olduğu gibi ona paslar.

Yani Windows'un Git'e "adapte olması" diye bir şey yok. Git'i kurduğunda **installer,
Git'in klasörünü PATH değişkenine ekliyor.** Hepsi bu. Docker Desktop kurunca da aynısı
oluyor. PowerShell'de şunu yazarsan bu listeyi kendi gözünle görebilirsin:

```powershell
$env:PATH -split ';'
```

Bu çıktının içinde Git de, Docker da, hatta senin `sqlplus`'ın bile vardır — çünkü
terminalde `sqlplus` yazınca çalışmasının sebebi de birebir aynı mekanizma. Oracle
client kurulurken kendi `bin` klasörünü PATH'e eklemiş, o kadar.

### Oracle refleksiyle bir analoji

PATH'i, shell'in `ALL_OBJECTS`'i gibi düşünebilirsin. `SELECT * FROM tablo` dediğinde
Oracle nasıl önce senin şemanda, sonra synonym'lerde, sonra public objelerde arıyorsa;
shell de komutu PATH'teki klasörlerde **soldan sağa arıyor ve ilk bulduğunu çalıştırıyor.**

Bu "ilk bulduğunu çalıştırma" davranışı, meşhur bir baş ağrısının da kaynağıdır:
bilgisayarında iki Python kuruluysa ve `python` yazınca "yanlış olan" açılıyorsa, sebep
neredeyse her zaman PATH'te o sürümün klasörünün önce gelmesidir. **PATH'te önde olan
kazanır.**

### Peki bu "anlaşma" ne zaman yapıldı?

Hiç yapılmadı. Ortada imzalanmış bir mutabakat yok. Bu konvansiyon **Unix'ten (1970'ler)**
geliyor: komutlar diskte birer dosyadır, shell onları bir arama yolunda bulur. DOS bu
mantığı taklit etti, Windows DOS'tan devraldı, PowerShell de Windows'tan. Yani Git veya
Docker, Windows için özel bir "büyü" yapmıyor; sadece işletim sisteminin **50 yıldır açık
duran standart bir kapısını** (PATH ve komut satırı konvansiyonlarını) kullanıyor.

Buradaki kilit fikri aklında tut, çünkü ikinci bölümde aynısı tekrarlanacak: **entegrasyon
yok, sadece ortak bir konvansiyona uymak var.**

## 2. Python içinde Airflow, Spark nasıl "entegre" oluyor?

Burada da aynı zarafet var. **Python'ın kendisi Airflow'u ya da Spark'ı tanımıyor.**
Python'ın bildiği tek şey şu: `import x` dediğinde `x`'i belirli klasörlerde aramak. Bu
klasörlerin listesine `sys.path` deniyor — kabaca **PATH'in Python versiyonu** diye
düşünebilirsin.

`pip install pyspark` dediğinde ne oluyor?

1. `pip`, **PyPI** denen merkezi bir depoya bağlanır (Oracle dünyasındaki bir repository
   gibi, ama halka açık ve herkesin paket yükleyebildiği).
2. Paketi indirip `site-packages` klasörüne koyar.
3. Artık `import pyspark` çalışır, çünkü o klasör `sys.path` içindedir.

Airflow'a Spark yeteneği eklemek de tıpatıp aynı: `apache-airflow-providers-apache-spark`
diye bir paket vardır, onu kurarsın, Airflow onu `sys.path`'te bulur ve `SparkSubmitOperator`
gibi hazır bileşenler emrine amade olur.

### Asıl soru: bu paketler birbiriyle nasıl konuşuyor?

Paketi bulmak bir şey; ama farklı dillerde yazılmış iki aracın gerçekten **anlaşması**
başka bir şey. Airflow Python ile yazılmış, Spark ise çoğunlukla Scala/Java (JVM üzerinde
çalışıyor). Bunlar nasıl konuşuyor? Cevap tek bir kavramda düğümleniyor: **arayüz (API)
sözleşmeleri.**

Her araç, "benimle konuşmak istiyorsan şu kurallara uy" diyen bir sözleşme yayınlıyor:

- **Spark** der ki: "Bana JVM üzerinden **Py4J** denen köprüyle bağlanırsan seninle
  konuşurum." PySpark, işte bu sözleşmeye uyan bir Python paketidir — arka planda Python
  ile Spark'ın Java sanal makinesi arasında mesaj taşır.
- **Kafka** der ki: "TCP üzerinden şu binary protokolle konuş." Bu sözleşmeye uyan bir sürü
  farklı istemci vardır: `kafka-python`, Java client, Go client, Rust client... Hepsi aynı
  protokolü konuştuğu için hepsi aynı Kafka'yla çalışır. (Debezium'un Kafka'ya veriyi böyle
  basar.)
- **Airflow** der ki: "Bana bir `Operator` sınıfı yaz, `execute()` metodunu doldur, gerisini
  ben hallederim." Herkes bu çerçeveye uyarak kendi "provider"ını yazar.

Yani entegrasyon bir sihir değil; **herkesin uyduğu, önceden yayınlanmış açık sözleşmeler.**
Bir aracın diğerini "tanıması" demek, aslında o aracın diğerinin ilan ettiği sözleşmeye
uyan bir kod parçası yazması demek.

### ODI'dan bildiğin bir şeye benziyor

Bu mantık aslında sana yabancı değil. ODI'daki **Knowledge Module**'leri düşün: ODI der ki
"Şu adımları, şu template yapısında yazarsan, seni her mapping'de otomatik çalıştırırım."
Sen de o çerçeveye uyan bir KM yazarsın, ODI onu tanır. **Airflow provider'ları da tam
olarak bu:** Airflow'un çizdiği çerçeveye uyan eklentiler. Fark şu ki ODI'de çerçeveyi
Oracle çiziyor; açık kaynakta çerçeveyi herkesin gördüğü, herkesin geliştirebildiği bir
topluluk çiziyor.

Python'a bu yüzden **"tutkal dil" (glue language)** denir. Kendisi C ile yazılmıştır ama
Java, Scala, C++, Rust ile rahatça köprü kurabilir. Bu yüzden veri dünyasında farklı
dillerdeki devasa motorları birbirine bağlayan yapıştırıcı hep Python olur.

## 3. Peki bütün bunları kim yönetiyor?

İşte konuşmanın en can alıcı yeri buydu. Monolitten gelince insan sürekli **bir yönetici**
arıyor: "Bu kadar araç birbirine bu kadar iyi oturuyorsa, birileri masanın başında oturup
karar veriyor olmalı." Ama öyle değil. **Merkezî bir yönetici yok.** Onun yerine
**katmanlı bir düzen** var:

- **Standart kuruluşları** en alttaki temeli döşüyor. TCP/IP ve HTTP protokolleri (IETF),
  POSIX (IEEE), Unicode, SQL standardı... Bunlar internetin ve işletim sistemlerinin ortak
  "veri tipleri" gibi. Kimse bunları tek başına değiştiremez.
- **Vakıflar** büyük projeleri barındırıyor. **Apache Software Foundation** (Kafka, Spark,
  Airflow, Iceberg — dikkat et, modern bir veri stack'inin neredeyse tamamı!), Linux
  Foundation, Python Software Foundation... Bunlar kâr amacı gütmeyen, gönüllü ve şirket
  desteğiyle ayakta duran tarafsız yapılar. Telif hakkını ve yönü onlar koruyor.
- **Şirketler** kendi ürünlerinin API'larını yayınlıyor ve **geriye dönük uyumluluğa**
  titizlikle özen gösteriyor. Çünkü bir API'yı kırarlarsa, o API'ya güvenen herkesin sistemi
  patlar ve kimse o aracı bir daha kullanmaz. Uyumluluk burada ticari bir zorunluluk.
- **Fiili (de facto) standartlar** ise en yaygın olan kazanınca kendiliğinden oluşuyor. Git'i
  bir kurul seçmedi; sadece herkes kullandı ve rakiplerini eledi. JSON'u kimse "standart"
  ilan etmedi; o kadar pratikti ki standart oldu.

Yani düzen "yukarıdan aşağıya emirle" değil, **"aşağıdan yukarıya uyumla"** kuruluyor. Sen
açık bir sözleşmeye uyarsan ekosisteme dahil olursun; uymazsan kimse seni kullanmaz ve
kaybolursun.

## 4. Yeni bir teknoloji ekosisteme nasıl "kabul ediliyor"?

Bu soruyu ayrıca sordum, çünkü en kafa karıştıran kısım burası: **Bugün yepyeni bir araç
çıksa — mesela Iceberg ilk çıktığı gün — Spark, Airflow, Trino gibi araçların onu tanımaya
başlamasına kim, ne zaman karar veriyor?** (Apache Iceberg gerçekten de 2018 civarı
Netflix'in içinden çıkıp bugün sektör standardı oldu.) Süreç, tam da yukarıdaki "merkezde
kimse yok" fikrinin canlı bir örneği. Organik bir evrimle işliyor:

**Aşama 0 — Doğuş.** Büyük bir şirket (örneğin Netflix) mevcut araçlarla (eski Hive tablo
formatı) devasa bir sorun yaşar, kendi içinde bir çözüm geliştirir ve "biz bunu tek başımıza
taşımayalım, açık kaynak yapalım, hem herkes kullansın hem geliştirsin" deyip projeyi bir
vakfa (ASF) devreder.

**Aşama 1 — İlk köprüleri mucit kendi atar.** Yeni teknoloji tutunmak istiyorsa, insanların
zaten kullandığı araçlarla konuşmak zorunda. Bu yüzden Iceberg'i yazan çekirdek ekip, ilk iş
olarak **Spark ve Flink konnektörlerini bizzat kendisi yazar.** Ekosisteme ilk boru hattını
yeni gelen döşer, çünkü tutunmak ona lazım.

**Aşama 2 — Topluluk baskısı.** Başarı hikâyeleri yayılır ("Iceberg'e geçtik, maliyet düştü,
sorgular uçtu"). Bunu okuyan mühendisler Airflow'un GitHub'ında issue açar: "Biz Iceberg'e
geçtik ama sizde ona özel bir operatör yok, ne zaman ekleyeceksiniz?" Talep birikir.

**Aşama 3 — Kararı iki güç veriyor.** Birincisi **gönüllü topluluk:** istekli bir geliştirici
"benim de buna ihtiyacım var" der, provider'ı yazar, Airflow maintainer'larına gönderir,
onlar inceleyip onaylar ve bir sonraki sürümde Iceberg resmî olarak tanınır. İkincisi — ve
çoğu zaman daha güçlü olanı — **ticari çıkar:** Databricks, Snowflake, AWS gibi devler
müşterilerini elde tutmak için popüler her yeni teknolojiyi desteklemek *zorundadır*.
Snowflake müşterilerinin Iceberg istediğini görünce kendi mühendislerine görev verir; rekabet,
entegrasyonu inanılmaz hızlandırır. (Nitekim Iceberg'in arkasındaki Tabular'ı Snowflake satın
aldı.)

Kabaca bir kronoloji:

| Zaman | Ne oluyor? | Kim yapıyor? |
| --- | --- | --- |
| 0. ay | Teknoloji doğar, açık kaynak olur | Mucit şirket (ör. Netflix) |
| 1–6. ay | En popüler 1-2 araca ilk köprüler atılır | Çekirdek geliştiriciler |
| 6–12. ay | Başarı hikâyeleri yayılır, talep birikir | Sahadaki mühendisler |
| 12–24. ay | Yan araçlar (Airflow, Trino) resmî paket çıkarır | Topluluk + şirketler |
| ~3. yıl | Bulut devleri "tıkla-kur" servis yapar | AWS, Azure, GCP |

Bir teknolojinin doğup "yerel (native) olarak her yerde tanınır" hale gelmesi genelde **1-3
yıl** sürüyor. Oracle'ın "ben bu yıl şu özelliği ekliyorum" dediği tek elden takvimin aksine,
burada **iyi olan, sorun çözen ve arkasına rüzgârı alan teknoloji, ekosistemi kendini
tanımaya mecbur bırakıyor.** Ekosistem de hayatta kalmak için o yeni legoyu içine alıyor.

## Özet: iki dünyanın kıyası

Kafamdaki monolit modelini bu yeni dünyaya çevirirken bana en çok yardımcı olan çerçeve bu
oldu:

| Kriter | Oracle (Monolit) | Modern Açık Kaynak Stack |
| --- | --- | --- |
| **Kim tasarlıyor?** | Tek şirket, her katmanı kontrol eder | Kimse — katmanlı, dağıtık bir düzen |
| **Entegrasyon yönü** | Yukarıdan aşağı, önceden lehimli | Aşağıdan yukarı, açık sözleşmelere uyumla |
| **Parçalar** | Birbirine bağımlı, tek çatı | Bağımsız legolar, tek işi iyi yapar |
| **Yeni özellik** | Şirketin takvimine bağlı | İhtiyaç + topluluk + rekabet belirler |
| **Yönetim** | Merkezî (Oracle) | Standartlar, vakıflar, fiili konvansiyonlar |

Üç mekanizmayı tek cümlede toplarsak:

- **Shell komutları** (`git`, `docker`, `sqlplus`) = **PATH** + diskteki `.exe` dosyaları.
- **Python entegrasyonları** (Airflow, Spark) = **pip + `import`** mekanizması + **API
  sözleşmeleri**.
- **Yönetim** = merkezî bir patron değil; standartların, vakıfların ve fiili konvansiyonların
  karışımı.

Monolitten gelince "her şey birbirine nasıl bu kadar entegre?" diye şaşırmak çok doğal. Ama
işin sırrı şu: **kimse bunları birbirine entegre etmedi.** Her araç, herkesin gördüğü açık bir
kapı (PATH), açık bir depo (PyPI) ve açık bir sözleşme (API) bıraktı. Sen o legoları
birleştirdiğinde aslında yıllardır orada duran o kapılardan geçiyorsun. Bir sonraki sefer
`git status` yazdığında ya da `pip install` çalıştırdığında, arkada dönen şeyin bir sihir
değil, 50 yıllık bir konvansiyon olduğunu bileceksin.
