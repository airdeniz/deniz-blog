---
title: 'Dil > Framework > Kütüphane: Bu Hiyerarşi Doğru mu, ve Veri Araçları Bunun Neresinde?'
description: '"Programlama dili > framework > kütüphane" sıralaması ilk bakışta doğru görünür ama tek eksen değildir: kapsam ekseninin yanında bir de "kontrol kimde" ekseni (Inversion of Control) vardır. Kütüphaneler her zaman bir frameworke ait midir, sadece belli frameworklerle çalışan bağımlı kütüphaneler var mıdır, ne zaman framework kurar ne zaman "kütüphane yeter" derim, ve bir şeyin framework mü kütüphane mi olduğunu sormadan nasıl anlarım? Bir de Spark, Airflow, Kafka gibi veri dünyasının ağır toplarının bu tablonun neresinde durduğunu — ve neden çoğunun aslında Python frameworkü olmadığını — baştan kuran bir yazı.'
pubDate: 2026-07-15
tags: ['Framework', 'Kütüphane', 'Python', 'Spark', 'Veri Mühendisliği', 'Backend']
draft: false
---

Yazılıma dışarıdan bakan hemen herkes kafasında şu sıralamayı kurar:

> Programlama dili > Framework > Kütüphane

Ve bu sıralama **yanlış değildir.** Kapsam ve büyüklük açısından bakınca gayet oturur: en altta
dilin kendisi vardır, onun üstünde dille yazılmış devasa iskeletler (framework) durur, en tepede de
tek bir işi çözen küçük araçlar (kütüphane) gezer. Bu haliyle "doğru mu?" diye sorulursa cevap
büyük ölçüde **evet.**

Ama bu tabloyu bir kez kurduktan sonra insanın aklına ard arda sorular gelmeye başlıyor: Kütüphaneler
hep bir frameworke mi ait? Framework kullanınca kütüphane kullanmak zorunda mıyım? Ne zaman koca bir
framework kurarım, ne zaman "bana kütüphane yeter" derim? Ve en sinsisi: karşıma çıkan yeni bir aracın
framework mü yoksa kütüphane mi olduğunu her seferinde birine sorarak mı öğreneceğim?

Bu yazı tam da o soruları, tek tek, sırayla kapatmak için. Sonunda da bu çerçeveyi veri dünyasının
ağır toplarına — Spark, Airflow, Kafka, dbt — uygulayıp orada çıkan tuhaf bir sürprizi konuşacağız.

## 1. Hiyerarşi doğru, ama tek eksen değil

Sıralamanın küçük eksiği şu: "büyükten küçüğe" tek bir eksende düşünmek, framework ile kütüphane
arasındaki asıl farkı gizliyor. İki ayrı eksen var:

- **Kapsam ekseni:** Dil en geniştir, framework onun bir alt kümesidir, kütüphane daha da dar bir
  problemi çözer. Baştaki sıralama bu eksende doğru.
- **Kontrol ekseni:** Asıl ayrım burada. Meşhur ismiyle **Inversion of Control** (Kontrolün Tersine
  Çevrilmesi). Tek cümlede: **kütüphaneyi sen çağırırsın, framework ise seni çağırır.**

Üç seviyeyi tanımlarken bu ikinci ekseni de işin içine katmak gerekiyor:

**1. Programlama Dili — temel.** Kodun alfabesini, kurallarını, söz dizimini (syntax) belirler.
Python, JavaScript, Java. Her şey bunun üstüne kurulur.

**2. Framework — yapısal iskelet.** Dille yazılmış, sana hazır bir uygulama iskeleti sunan büyük
yapı. Kuralları **framework koyar**, sen onun çizdiği sınırların içinde kod yazarsın. Django (Python),
Spring (Java), Angular (TypeScript).

**3. Kütüphane — yardımcı araç.** Belirli bir problemi çözen, daha dar kapsamlı bir kod koleksiyonu.
Kontrol **tamamen sende**: akışı sen yönetirsin, ihtiyacın olduğunda kütüphaneyi çağırırsın. Pandas,
NumPy, Requests.

İnşaat analojisiyle:

- **Dil**, inşaat malzemesidir (tuğla, çimento). Ham güç.
- **Framework**, evin hazır projesi ve taşıyıcı kolonlarıdır. Odaların yeri bellidir, taşıyıcının
  dışına çıkamazsın.
- **Kütüphane**, eve aldığın hazır eşyadır. Mutfak robotunu (Pandas) ihtiyacın olunca dolaptan çıkarıp
  çalıştırırsın, işin bitince kaldırırsın.

Yani "Dil > Framework > Kütüphane" hiyerarşisini **kapsam** açısından kabul etmek doğru; sadece
framework ile kütüphaneyi ayıran çizginin büyüklük değil, **kontrolün kimde olduğu** olduğunu akılda
tutmak lazım. Bundan sonraki her soru, aslında bu iki eksenin bir sonucu.

## 2. Bir dosya açıp `print("deniz")` yazınca ne kullanmış oluyorum?

En saf durumdan başlayalım, çünkü tabloyu netleştiriyor. Boş bir `.py` dosyası açıp içine sadece şunu
yazsan:

```python
print("deniz")
```

**Ne framework kullanmış olursun, ne de kütüphane.** Burada yalnızca **dilin kendisini** — ve onun
çekirdeğinde gelen, hiçbir `import` gerektirmeyen `print()` gibi yerleşik (built-in) fonksiyonları —
kullanıyorsun. Dışarıdan ne bir "hazır yapı", ne bir "yardımcı alet" aldın; tamamen dilin yalın
gücüyle çalışıyorsun. En temel, en saf seviye bu.

Aynı satırı üç seviyeye oturtalım:

| Seviye | Karşılığı | Ne yapmış olursun? |
| --- | --- | --- |
| **Dil (saf Python)** | Kalem ve kâğıtla yazmak | `print("deniz")` — doğrudan dilin temel yeteneği |
| **Kütüphane** | Cepten bir alet çıkarmak | `import math` deseydin, bir aracı çağırmış olurdun |
| **Framework** | Hazır bir formu doldurmak | Django olsaydı, sana verilen dosya yapısı içinde kurallara göre yazardın |

Bu saf seviyeyi aklında tut; çünkü "kütüphane" ve "framework" dediğimiz her şey, bu yalın zeminin
üstüne eklenen katmanlar.

## 3. Kütüphaneler her zaman bir frameworke mi ait? (Cevap: hayır)

Yaygın bir yanılgı: "kütüphane" deyince insan onu bir frameworkün içindeki bir parça sanıyor. Oysa
kütüphanelerin ezici çoğunluğu **tamamen bağımsızdır** ve tek başına ayakta durur.

En temiz örnek Pandas. Pandas hiçbir frameworkün (Django, Flask...) boyunduruğu altında değildir. Boş
bir Python dosyası açıp, hiçbir framework olmadan, sadece veri analizi için import edip kullanabilirsin:

```python
import pandas as pd

df = pd.DataFrame({"İsim": ["Deniz"], "Yaş": [29]})
print(df)
```

İlişkiyi üç kuralla özetleyebiliriz:

- **Kütüphaneler özgürdür.** Pandas'ı, NumPy'ı, Requests'i canın nerede isterse orada import eder,
  işin bitince bırakırsın. Kullanmak için bir frameworke ihtiyacın yoktur.
- **Framework'ler kütüphaneleri kullanır.** Django arka planda veritabanına bağlanmak, şifreleme
  yapmak, veri işlemek için onlarca kütüphaneyi kendi içine dahil eder.
- **İkisini bir arada kullanabilirsin.** FastAPI ile bir API yazarken, gelen veriyi analiz etmek için
  projene Pandas'ı da eklersin. Burada Pandas frameworkün bir parçası olmaz; senin o projede kullandığın
  **bağımsız bir yardımcı** olarak kalır.

Kütüphaneler, çantandaki bağımsız aletler gibi: Tornavidayı (Pandas) istersen tek bir vidayı sökmek
için kullanırsın, istersen devasa bir fabrika inşaatının (framework) içinde. Tornavida fabrikaya ait
değildir.

### Peki tersi? Sadece belli bir frameworkle çalışan kütüphaneler var mı?

Evet — ve bunlar kuralın istisnası değil, ayrı bir kategori. Bu tür kütüphanelere genelde **eklenti
(extension)**, **paket (package)** ya da **plugin** denir. Kendi başlarına hiçbir işe yaramazlar;
tek varlık sebepleri, belirli bir frameworkün bir eksiğini kapatmak ya da ona yeni bir yetenek
kazandırmaktır.

- **Django REST Framework (DRF):** Sadece Django ile çalışır. Django projelerine hızlıca API yeteneği
  ekler. Django yoksa hiçbir hükmü yoktur.
- **Flask-SQLAlchemy:** Sadece Flask ile çalışır; Flask projelerinde veritabanı işlerini kolaylaştırmak
  için tasarlanmıştır.
- **Redux:** Aslında bağımsız bir kütüphanedir ama pratikte neredeyse hep React ile durum yönetimi için
  birlikte kullanılır.

Kabaca ikiye ayırırsak:

| Kütüphane türü | Özelliği | Örnek |
| --- | --- | --- |
| **Tamamen bağımsız** | İstediğin yerde çalışır: tek bir dosyada da, herhangi bir framework içinde de | Pandas, NumPy, Requests |
| **Frameworke bağımlı** | Sadece ait olduğu framework kuruluysa çalışır | Django REST Framework, Flask-SQLAlchemy |

## 4. Framework kullanınca kütüphane kullanmak zorunda mıyım? (Yine hayır)

Hayır. Hatta çoğu modern framework "batteries-included" (her şey içinde) felsefesiyle gelir ve bir
projeyi ayağa kaldırmak için ihtiyacın olan neredeyse her şeyi kendi içinde barındırır.

Django'yu düşün. Bir web sitesi yaparken veritabanı işlemleri (ORM), kullanıcı giriş/yetkilendirme,
sayfa yönlendirmeleri (routing), temel güvenlik önlemleri — hepsi kutudan hazır çıkar. Dışarıdan tek
bir kütüphane bile import etmeden, sadece saf Django ile devasa ve güvenli bir site bitirebilirsin.

Dışarıdan kütüphaneyi, frameworkün kendi yeteneği yetmediğinde çağırırsın:

- **Sadece framework:** Django ile bir e-ticaret sitesi. Hiç dış kütüphane yok.
- **Framework + kütüphane:** Aynı siteye gelen satış verilerini analiz edip grafik göstermek istedin.
  İşte o an projene Pandas ve Matplotlib eklersin.

Yani dış kütüphane bir **zorunluluk değil, tercih.** Frameworkün yeteneği yettiği sürece hiç
dokunmazsın; işi hızlandırmak ya da özel bir şey yapmak istediğinde kütüphaneyi yardıma çağırırsın.

## 5. Kütüphaneyi `import` ediyoruz — peki frameworkü nasıl kullanıyoruz?

Buradaki fark, aslında baştaki "kontrol ekseni" farkının pratikteki yansıması. Kütüphaneyi kodunun
ortasında sen çağırırsın; framework ise seni bir düzenin içine oturtur. Bu yüzden bir frameworkü
kullanmak genelde tek bir `import` satırından fazlasıdır ve üç aşamaya yayılır.

**1. Terminalden iskeleti oluşturmak (CLI).** Framework devasa bir yapı olduğu için işe genelde
terminalden başlarsın. Bu komut senin için hazır bir klasör/dosya şablonu üretir:

```bash
django-admin startproject benim_sitem
```

Bu komut çalıştığı an framework senin için ayar dosyalarını, veritabanı bağlantılarını ve yönlendirme
şablonlarını içeren bir klasör yapısı oluşturur.

**2. Frameworkün kurallarına göre kod yazmak.** Klasörler oluştuktan sonra framework der ki: "Sayfa
tasarlayacaksan kodunu `views.py`'a yaz, linkini `urls.py`'a ekle." Kendi kafana göre `deniz.py` açıp
sistemi orada çalıştıramazsın. Kod içinde yine `import` kullanırsın — ama bu sefer frameworkün sana
sunduğu parçaları çağırmak için, ve kontrol sende değil:

```python
from django.http import HttpResponse

# Frameworkün senden beklediği isimde ve yapıda bir fonksiyon
def ana_sayfa(request):
    return HttpResponse("Merhaba Deniz!")
```

**3. Sistemi frameworkün motoruyla ayağa kaldırmak.** Yazdığın kodun çalışması için yine terminale
gidip frameworkün kendi motorunu çalıştırırsın:

```bash
python manage.py runserver
```

Bu komutla framework kontrolü tamamen ele alır: arka planda bir sunucu başlatır, kodlarını tarar,
`ana_sayfa` fonksiyonunu **doğru istek geldiğinde kendisi çağırır.** Sen fonksiyonu yazıp bir köşeye
koydun; ne zaman çalışacağına o karar veriyor. İşte "framework seni çağırır" cümlesinin somut hali bu.

| Eylem | Kütüphane | Framework |
| --- | --- | --- |
| **Projeye nasıl girer?** | Kodun içine `import` edilerek | Terminalden komutla iskelet oluşturularak |
| **Kontrol kimde?** | Sende — akışı sen yönetirsin | Frameworkte — o yönetir, senin kodunu çağırır |
| **Nasıl çalıştırılır?** | Standart `python dosya.py` | Frameworkün komutuyla: `python manage.py runserver` |

### İndirme kısmında ise fark yok: ikisi de `pip install`

Kafa karıştıran nokta şu: kütüphaneyi `pip install` ile indiriyoruz, ya frameworkü? Cevap: **onu da
`pip install` ile.** İndirme tarafında hiçbir fark yoktur. Python dünyasında dışarıdan eklediğin şey
ister devasa bir framework olsun ister minik bir kütüphane, hepsi **PyPI** (Python Package Index)
denen ortak havuzda durur; `pip` de o havuzdan indiren paket yöneticisidir.

```bash
pip install django
```

Fark **indirdikten sonra** başlar:

- **Kütüphane** aldığın bir *el aletidir*: `pip install pandas` der, hemen dosyayı açıp `import pandas`
  yazıp kullanmaya başlarsın.
- **Framework** ise *demonte gelen büyük bir mobilyadır*: `pip install django` dersin ama hemen kod
  yazamazsın; önce `django-admin startproject` ile onu **kurman (monte etmen)** gerekir.

## 6. Ne zaman framework, ne zaman "kütüphane yeter"?

İki pratik soru kaldı. Önce kararı, sonra teşhisi.

### Karar: işin büyüklüğü, amacı ve yönetim ihtiyacı

**Sadece kütüphane yeter dediğin durumlar:**

- **Tek bir odağın varsa:** Sadece veri analizi (Pandas), sadece grafik (Matplotlib), sadece veri
  çekme (Requests), sadece model eğitme (scikit-learn).
- **Kontrolü tamamen elinde tutmak istiyorsan:** "Dosya düzenimi kendim kurarım, araya ihtiyaç oldukça
  kütüphane serpiştiririm" diyorsan.
- **Script seviyesinde işler yapıyorsan:** Tek bir dosyada çalışıp bitecek işler için framework
  yüklenmez.

**Framework kullanman gereken durumlar:**

- **Büyük, standart, organize bir sistem kuruyorsan:** Bir web sitesi (Django/FastAPI), büyük bir
  mobil uygulama.
- **Tekerleği yeniden keşfetmek istemiyorsan:** Kullanıcı giriş sistemi, veritabanı güvenliği,
  yönlendirme gibi şeyleri sıfırdan yazmak aylar alır; framework bunları paket halinde verir.
- **Ekiple çalışıyorsan:** Framework kullanınca herkes kodun nereye yazılacağını bilir. "Veritabanı
  kodunu nereye koyayım?" diye sorulmaz, çünkü yeri zaten bellidir.

### Teşhis: bir şeyin framework mü kütüphane mi olduğunu sormadan anlamak

İyi haber: sormana gerek yok. Birkaç net ipucu var.

**A) "Getting Started" dokümanına bak (en garanti yol).** Teknolojinin sitesine/GitHub'ına girip
başlangıç kısmına göz at:

- Doküman sana direkt `import teknoloji` yazdırıp kod yazdırıyorsa → **kütüphane.**
- Doküman sana terminale `teknoloji-admin start` ya da `create-teknoloji-app` gibi bir komut yazdırıp
  otomatik klasörler oluşturuyorsa → **framework.**

**B) Sloganına bak.** Ana sayfadaki tanıtım cümlesi çoğu zaman kendini ele verir:

- "A Python **library** for data analysis" (Pandas) → kütüphane.
- "The web **framework** for perfectionists" (Django) → framework.

**C) "Kontrol kimde?" testi.** Zihinsel test: *"Ben mi onu çağırıyorum, o mu beni çağırıyor?"*

- Kendi kodunun ortasında "hadi şimdi şu veriyi oku" diye onu sen çağırıyorsan (`pd.read_csv()`) →
  **kütüphane.**
- Sen kodu yazıp bir köşeye koyuyorsun, arkadaki motor senin kodunu istediği zaman alıp çalıştırıyorsa
  → **framework.**

## 7. Peki Spark, Airflow, Kafka? Veri dünyasının ağır topları

Şimdi bu çerçeveyi veri mühendisliğinin en çok kullanılan araçlarına uygulayalım — ve orada güzel bir
sürpriz var. Kısa cevap: **Spark ve arkadaşlarının neredeyse hepsi kütüphane değil, framework.** Zaten
bu yüzden büyük veri projelerinde tek bir dosya açıp kod yazmak yetmez; arkada bu frameworklerin
çalışacağı koca bir sunucu sistemi (cluster / küme) kurulur.

Alanlara göre en çok kullanılanlar:

| Framework | Ne işe yarar? | "Kontrol kimde?" testi |
| --- | --- | --- |
| **Apache Spark** | Dağıtık, bellekte (in-memory) büyük veri işleme | Sen "ne" istediğini söylersin; veriyi sunuculara bölüp hesaplamayı Spark'ın motoru yönetir |
| **Apache Flink** | Gerçek zamanlı (true streaming) veri işleme | Gelen her olayı motor kendi akışında işler |
| **Apache Kafka** | Sistemler arası canlı veri taşıma / olay akışı | Kendi "broker" sunucuları arkada sürekli çalışır |
| **Apache Airflow** | İş akışı (pipeline) zamanlama ve orkestrasyon | Kodunu `dags/`'a koyarsın; ne zaman çalışacağına scheduler karar verir |
| **dbt** | Veri ambarında SQL ile dönüşüm/modelleme | `dbt run` ile derler ve çalıştırır; klasör yapısını o dayatır |
| **Trino / Presto** | Farklı kaynakları tek SQL ile sorgulama | Sorguyu dağıtıp birleştirmeyi motor yapar |
| **Ray** | Python AI/ML iş yüklerini kümeye dağıtma | Dağıtımı motor yönetir |

Hepsinde ortak nokta, yukarıdaki "kontrol kimde?" testini geçmeleri: sen "ne" istediğini söylersin,
"nasıl" kısmını — veriyi bölmek, sunuculara dağıtmak, zamanlamak — motor kendisi halleder. Bu, tanımı
gereği framework davranışıdır.

Bu büyük frameworklerin **içinde** ise daha dar işleri yapan kütüphaneler bulunur. Örneğin Spark bir
framework; ama Spark SQL (içinde SQL yazma), MLlib (makine öğrenmesi), Spark Streaming (canlı akış)
onun içindeki kütüphanelerdir. Fabrika Spark'tır; içindeki bantlar ve robot kollar (MLlib, Spark SQL)
kütüphanelerdir.

### Sürpriz: bunların çoğu aslında bir *Python* frameworkü değil

İşte teşhis testinin ince yeri. "Spark bir Python frameworkü mü?" sorusunun cevabı **tam olarak
hayır.** Spark özünde **Scala ile yazılmıştır ve JVM (Java Sanal Makinesi) üzerinde çalışır.** Onun
ana vatanı Java/Scala dünyası. Peki biz nasıl Python ile Spark yazıyoruz? Araya **PySpark** giriyor:

- Kodunda `from pyspark.sql import SparkSession` yazarsın.
- Yazdığın Python, **Py4J** denen bir köprüyle arka planda Java/Scala koduna çevrilir.
- Asıl ağır işi — veriyi bölmek, işlemek — yine arkadaki JVM (Spark Core) yapar.
- Sonuç tekrar Python'a çevrilip sana sunulur.

Yani Spark teknik olarak bir **JVM frameworküdür**; `pip install pyspark` ile kullandığın şey ise o
devasa motoru Python'dan yönetmeni sağlayan bir **arayüz (wrapper / API)**. Ama günün sonunda işini
Python yazarak hallettiğin için ona pratikte "Python ekosisteminin büyük veri frameworkü" demek de
yanlış olmuyor. Aynı ayrım **Kafka** için de geçerli: Kafka da Java/Scala ile yazılmış bir platformdur;
Python'dan ona bağlanmak için `confluent-kafka` ya da `kafka-python` gibi **aracı kütüphaneleri**
kullanırsın — kütüphane senin elinde, framework arkadaki sunucuda.

**dbt** ve **Airflow** ise madalyonun öbür yüzü: her ikisi de **Python ile yazılmıştır.** Ama bu onları
"kütüphane" yapmaz — ikisi de frameworktür, çünkü teşhis testlerini geçerler. dbt sana `dbt init` ile
katı bir klasör yapısı dayatır, SQL'ini alıp derler (`dbt run`) ve veri ambarında çalıştırır. Airflow
kodunu `dags/` klasörüne yazdırır, arka planda kendi scheduler'ı, web sunucusu ve metadata veritabanı
sürekli çalışır; kodunu ne zaman çalıştıracağına sen değil, o karar verir. İkisinin de kendi
frameworke-bağımlı paketleri (kütüphaneleri) vardır bile: dbt'nin `dbt-utils`'i, Django'nun DRF'i gibi,
sadece dbt içinde `packages.yml`'a yazılarak çalışır.

Kısacası "hangi dille yazıldığı" ile "framework mü kütüphane mi olduğu" birbirinden ayrı sorular.
Bir aracın dili nerede yazıldığını söyler; framework mü kütüphane mi olduğunu ise **kontrolün kimde
olduğu** söyler.

## Özet

Baştaki sıralamaya dönersek: "Programlama dili > Framework > Kütüphane" **kapsam ekseninde doğru** bir
hiyerarşi. Sadece unutulmaması gereken tek şey, framework ile kütüphaneyi ayıran çizginin büyüklük
değil **kontrol** olması.

- **Dil** temeldir; `print("deniz")` yazdığında ne framework ne kütüphane, sadece dili kullanırsın.
- **Kütüphane** bağımsız bir alettir — çoğu (Pandas) hiçbir frameworke ait değildir; sen çağırırsın,
  `import` edersin, akış sende kalır.
- **Framework** bir iskelettir — seni çağırır, kuralları o koyar, CLI ile kurulur; ama indirme tarafı
  kütüphaneyle aynıdır (`pip install`).
- **Bazı kütüphaneler** yalnızca belli bir framework içinde çalışır (DRF, Flask-SQLAlchemy, dbt-utils).
- **Framework mü kütüphane mi** sorusunu sormadan çözmenin yolu: getting-started dokümanı, slogan ve
  "kontrol kimde?" testi.
- **Spark, Flink, Kafka, Airflow, dbt** birer frameworktür; ama bir kısmı (Spark, Kafka) aslında JVM
  dünyasından gelir ve Python'a köprülerle bağlanır — dili nerede yazıldığını, kontrolü ise framework
  mü kütüphane mi olduğunu belirler.

Bir dahaki sefere yeni bir araçla karşılaştığında, "acaba framework mü kütüphane mi?" diye kime
soracağını düşünmek yerine tek bir soru sor: **ben mi onu çağırıyorum, o mu beni çağırıyor?** Gerisi
kendiliğinden yerine oturuyor.
