---
title: 'Dil > Framework > Kütüphane: Doğru Ama Eksik Bir Hiyerarşi'
description: 'Bu tanıdık sıralama kapsam açısından doğru, ama framework ile kütüphaneyi ayıran asıl çizgiyi — kontrolün kimde olduğunu — gizliyor. Bağımsız ve frameworke bağımlı kütüphaneler, "kütüphane yeter" ile "framework şart" arasındaki karar, bir aracı sormadan teşhis etmenin yolları ve Spark, Airflow, Kafka, dbt''nin bu tabloda hiç beklenmedik yeri.'
pubDate: 2026-07-15
tags: ['Framework', 'Kütüphane', 'Python', 'Spark', 'Veri Mühendisliği', 'Backend']
draft: false
---

Yazılıma dışarıdan bakan hemen herkes zihninde şu sıralamayı kurar:

> Programlama dili > Framework > Kütüphane

Bu sıralama **yanlış değildir.** Kapsam açısından gayet oturur: en altta dilin
kendisi durur, üstünde o dille yazılmış büyük iskeletler (framework) yükselir, en
tepede de tek bir işi çözen küçük araçlar (kütüphane) gezer. "Doğru mu?" diye
sorulursa cevap büyük ölçüde **evettir.**

Ama tablo bir kez kurulunca sorular art arda gelir: Kütüphaneler hep bir frameworke
mi aittir? Framework kullanınca kütüphane kullanmak zorunda mıyım? Ne zaman koca bir
framework kurarım, ne zaman "bana kütüphane yeter" derim? Ve en sinsisi: karşıma
çıkan yeni bir aracın framework mü kütüphane mi olduğunu her seferinde birine
sorarak mı öğreneceğim?

Bu yazı tam da bu soruları sırayla kapatmak için. Sonunda aynı çerçeveyi veri
dünyasının ağır toplarına — Spark, Airflow, Kafka, dbt — uygulayacağız ve orada
ortaya çıkan beklenmedik bir durumu konuşacağız.

## 1. Hiyerarşi doğru, ama tek eksen değil

Sıralamanın küçük eksiği şu: her şeyi "büyükten küçüğe" tek bir eksene dizmek,
framework ile kütüphane arasındaki asıl farkı gizliyor. Ortada iki ayrı eksen var:

- **Kapsam ekseni:** Dil en geniştir, framework onun üstüne kurulur, kütüphane daha
  da dar bir problemi çözer. Baştaki sıralama bu eksende doğrudur.
- **Kontrol ekseni:** Asıl ayrım burada. Meşhur adıyla **Inversion of Control**
  (Kontrolün Tersine Çevrilmesi). Tek cümlede: **kütüphaneyi sen çağırırsın,
  framework ise seni çağırır.**

Üç seviyeyi tanımlarken bu ikinci ekseni de hesaba katmak gerekiyor:

**1. Programlama Dili — temel.** Kodun alfabesini, kurallarını, söz dizimini
(syntax) belirler. Python, JavaScript, Java. Her şey bunun üstüne kurulur.

**2. Framework — yapısal iskelet.** Dille yazılmış, sana hazır bir uygulama
iskeleti sunan büyük yapı. Kuralları **framework koyar**; sen onun çizdiği
sınırların içinde kod yazarsın. Django (Python), Spring (Java), Angular
(TypeScript).

**3. Kütüphane — yardımcı araç.** Belirli bir problemi çözen, dar kapsamlı bir kod
koleksiyonu. Kontrol **tamamen sendedir**: akışı sen yönetirsin, ihtiyaç duyduğunda
kütüphaneyi çağırırsın. Pandas, NumPy, Requests.

İnşaat benzetmesiyle:

- **Dil**, inşaat malzemesidir (tuğla, çimento). Ham güç.
- **Framework**, evin hazır projesi ve taşıyıcı kolonlarıdır. Odaların yeri
  bellidir; taşıyıcının dışına çıkamazsın.
- **Kütüphane**, eve aldığın hazır eşyadır. Mutfak robotunu (Pandas) ihtiyaç olunca
  dolaptan çıkarır, işin bitince kaldırırsın.

Özetle "Dil > Framework > Kütüphane" hiyerarşisini **kapsam** açısından kabul etmek
doğru; yalnızca framework ile kütüphaneyi ayıran çizginin büyüklük değil,
**kontrolün kimde olduğu** olduğunu akılda tutmak gerekiyor. Bundan sonraki her
soru, aslında bu iki eksenin bir sonucu.

## 2. Bir dosya açıp `print("deniz")` yazınca ne kullanmış oluyorum?

En yalın durumdan başlayalım, çünkü tabloyu netleştiriyor. Boş bir `.py` dosyası
açıp içine yalnızca şunu yazsan:

```python
print("deniz")
```

**Ne framework kullanmış olursun, ne de kütüphane.** Burada yalnızca **dilin
kendisini** — ve onun çekirdeğinde gelen, hiçbir `import` gerektirmeyen `print()`
gibi yerleşik (built-in) fonksiyonları — kullanırsın. Dışarıdan ne bir hazır yapı
aldın, ne bir yardımcı alet; tamamen dilin yalın gücüyle çalışıyorsun. En temel
seviye budur.

Aynı satırı üç seviyeye oturtalım:

| Seviye | Karşılığı | Ne yapmış olursun? |
| --- | --- | --- |
| **Dil (saf Python)** | Kalem ve kâğıtla yazmak | `print("deniz")` — doğrudan dilin temel yeteneği |
| **Kütüphane** | Cepten bir alet çıkarmak | `import math` deseydin, bir aracı çağırmış olurdun |
| **Framework** | Hazır bir formu doldurmak | Django olsaydı, sana verilen dosya yapısı içinde kurallara göre yazardın |

Bu yalın seviyeyi aklında tut; çünkü "kütüphane" ve "framework" dediğimiz her şey,
bu zeminin üstüne eklenen birer katman.

## 3. Kütüphaneler her zaman bir frameworke mi ait? (Cevap: hayır)

Yaygın bir yanılgı: "kütüphane" deyince insan onu bir frameworkün içindeki bir
parça sanıyor. Oysa kütüphanelerin ezici çoğunluğu **tamamen bağımsızdır** ve tek
başına ayakta durur.

En temiz örnek Pandas. Pandas hiçbir frameworke (Django, Flask...) bağlı değildir.
Boş bir Python dosyası açıp, ortada hiçbir framework yokken, yalnızca veri analizi
için import edip kullanabilirsin:

```python
import pandas as pd

df = pd.DataFrame({"İsim": ["Deniz"], "Yaş": [29]})
print(df)
```

İlişkiyi üç kuralla özetleyebiliriz:

- **Kütüphaneler özgürdür.** Pandas'ı, NumPy'ı, Requests'i istediğin yerde import
  eder, işin bitince bırakırsın. Kullanmak için bir frameworke ihtiyacın yoktur.
- **Frameworkler kütüphaneleri kullanır.** Django, veritabanına bağlanmak,
  şifreleme yapmak, veri işlemek için arka planda onlarca kütüphaneyi kendi içine
  alır.
- **İkisini bir arada kullanabilirsin.** FastAPI ile bir API yazarken, gelen veriyi
  analiz etmek için projeye Pandas'ı da eklersin. Pandas burada frameworkün parçası
  olmaz; o projede kullandığın **bağımsız bir yardımcı** olarak kalır.

Kütüphaneler, çantandaki bağımsız aletler gibidir: tornavidayı (Pandas) istersen
tek bir vidayı sökmek için kullanırsın, istersen devasa bir fabrika inşaatının
(framework) içinde. Tornavida fabrikaya ait değildir.

### Peki tersi? Sadece belli bir frameworkle çalışan kütüphaneler var mı?

Evet — ve bunlar kuralın istisnası değil, ayrı bir kategori. Bu tür kütüphanelere
genellikle **eklenti (extension)**, **paket (package)** ya da **plugin** denir.
Kendi başlarına bir işe yaramazlar; tek varlık sebepleri, belirli bir frameworkün
eksiğini kapatmak ya da ona yeni bir yetenek kazandırmaktır.

- **Django REST Framework (DRF):** Yalnızca Django ile çalışır; Django projelerine
  hızlıca API yeteneği ekler. Django yoksa bir anlamı yoktur.
- **Flask-SQLAlchemy:** Yalnızca Flask ile çalışır; Flask projelerinde veritabanı
  işlerini kolaylaştırmak için tasarlanmıştır.
- **Redux:** Aslında bağımsız bir kütüphanedir ama pratikte neredeyse her zaman
  React ile, durum yönetimi için birlikte kullanılır.

Kabaca ikiye ayırırsak:

| Kütüphane türü | Özelliği | Örnek |
| --- | --- | --- |
| **Tamamen bağımsız** | İstediğin yerde çalışır: tek bir dosyada da, herhangi bir framework içinde de | Pandas, NumPy, Requests |
| **Frameworke bağımlı** | Yalnızca ait olduğu framework kuruluysa çalışır | Django REST Framework, Flask-SQLAlchemy |

## 4. Framework kullanınca kütüphane kullanmak zorunda mıyım? (Yine hayır)

Hayır. Aksine, çoğu modern framework "batteries-included" (her şey içinde)
felsefesiyle gelir ve bir projeyi ayağa kaldırmak için gereken hemen her şeyi kendi
içinde barındırır.

Django'yu düşün. Bir web sitesi yaparken veritabanı işlemleri (ORM), kullanıcı
girişi ve yetkilendirme, sayfa yönlendirmeleri (routing), temel güvenlik önlemleri
— hepsi kutudan hazır çıkar. Dışarıdan tek bir kütüphane bile import etmeden,
yalnızca saf Django ile büyük ve güvenli bir site bitirebilirsin.

Dış kütüphaneyi, frameworkün kendi yeteneği yetmediğinde çağırırsın:

- **Sadece framework:** Django ile bir e-ticaret sitesi. Hiç dış kütüphane yok.
- **Framework + kütüphane:** Aynı siteye gelen satış verilerini analiz edip grafik
  göstermek istedin. O an projeye Pandas ve Matplotlib eklersin.

Kısacası dış kütüphane bir **zorunluluk değil, tercihtir.** Frameworkün yeteneği
yettiği sürece dokunmazsın; işi hızlandırmak ya da özel bir şey yapmak istediğinde
kütüphaneyi yardıma çağırırsın.

## 5. Kütüphaneyi `import` ediyoruz — peki frameworkü nasıl kullanıyoruz?

Buradaki fark, baştaki "kontrol ekseni"nin pratikteki yansıması. Kütüphaneyi kodunun
ortasında sen çağırırsın; framework ise seni bir düzenin içine oturtur. Bu yüzden
bir framework kullanmak genellikle tek bir `import` satırından fazlasıdır ve üç
aşamaya yayılır.

**1. Terminalden iskeleti oluşturmak (CLI).** Framework büyük bir yapı olduğu için
işe genellikle terminalden başlarsın. Şu komut, senin için hazır bir klasör ve
dosya şablonu üretir:

```bash
django-admin startproject benim_sitem
```

Komut çalıştığı an framework; ayar dosyalarını, veritabanı bağlantılarını ve
yönlendirme şablonlarını içeren bir klasör yapısı oluşturur.

**2. Frameworkün kurallarına göre kod yazmak.** Klasörler oluştuktan sonra
framework der ki: "Sayfa tasarlayacaksan kodunu `views.py`'a yaz, linkini
`urls.py`'a ekle." Kendi kafana göre bir `deniz.py` açıp sistemi orada
çalıştıramazsın. Kod içinde yine `import` kullanırsın — ama bu kez frameworkün sana
sunduğu parçaları çağırmak için, ve kontrol sende değildir:

```python
from django.http import HttpResponse

# Frameworkün senden beklediği isimde ve yapıda bir fonksiyon
def ana_sayfa(request):
    return HttpResponse("Merhaba Deniz!")
```

**3. Sistemi frameworkün motoruyla ayağa kaldırmak.** Yazdığın kodun çalışması için
yine terminale döner, frameworkün kendi motorunu başlatırsın:

```bash
python manage.py runserver
```

Bu komutla framework kontrolü tamamen ele alır: arka planda bir sunucu başlatır,
kodunu tarar ve `ana_sayfa` fonksiyonunu **doğru istek geldiğinde kendisi çağırır.**
Sen fonksiyonu yazıp bir köşeye koydun; ne zaman çalışacağına o karar veriyor.
"Framework seni çağırır" cümlesinin somut hali tam olarak budur.

| Eylem | Kütüphane | Framework |
| --- | --- | --- |
| **Projeye nasıl girer?** | Kodun içine `import` edilerek | Terminalden komutla iskelet oluşturularak |
| **Kontrol kimde?** | Sende — akışı sen yönetirsin | Frameworkte — o yönetir, senin kodunu çağırır |
| **Nasıl çalıştırılır?** | Standart `python dosya.py` | Frameworkün komutuyla: `python manage.py runserver` |

### İndirme tarafında ise fark yok: ikisi de `pip install`

Kafa karıştıran nokta şu: kütüphaneyi `pip install` ile indiriyoruz, peki
frameworkü? Cevap: **onu da `pip install` ile.** İndirme tarafında hiçbir fark
yoktur. Python dünyasında dışarıdan eklediğin şey ister devasa bir framework olsun
ister minik bir kütüphane, hepsi **PyPI** (Python Package Index) denen ortak
havuzda durur; `pip` de o havuzdan indiren paket yöneticisidir.

```bash
pip install django
```

Fark **indirdikten sonra** başlar:

- **Kütüphane**, satın aldığın bir *el aletidir*: `pip install pandas` der, hemen
  dosyayı açıp `import pandas` yazar ve kullanmaya başlarsın.
- **Framework** ise *demonte gelen büyük bir mobilyadır*: `pip install django`
  dersin ama hemen kod yazamazsın; önce `django-admin startproject` ile onu
  **kurman (monte etmen)** gerekir.

## 6. Ne zaman framework, ne zaman "kütüphane yeter"?

İki pratik soru kaldı. Önce karar, sonra teşhis.

### Karar: işin büyüklüğü, amacı ve yönetim ihtiyacı

**Kütüphanenin yettiği durumlar:**

- **Tek bir odağın varsa:** Yalnızca veri analizi (Pandas), yalnızca grafik
  (Matplotlib), yalnızca veri çekme (Requests), yalnızca model eğitme
  (scikit-learn).
- **Kontrolü tamamen elinde tutmak istiyorsan:** "Dosya düzenimi kendim kurarım,
  ihtiyaç oldukça araya kütüphane eklerim" diyorsan.
- **Script seviyesinde işler yapıyorsan:** Tek bir dosyada çalışıp bitecek işler
  için framework kurulmaz.

**Frameworkün gerektiği durumlar:**

- **Büyük, standart, organize bir sistem kuruyorsan:** Bir web sitesi
  (Django/FastAPI), büyük bir mobil uygulama.
- **Tekerleği yeniden icat etmek istemiyorsan:** Kullanıcı giriş sistemi, veritabanı
  güvenliği, yönlendirme gibi parçaları sıfırdan yazmak aylar alır; framework
  bunları paket halinde verir.
- **Ekiple çalışıyorsan:** Framework varken herkes kodun nereye yazılacağını bilir.
  "Veritabanı kodunu nereye koyayım?" sorusu sorulmaz, çünkü yeri zaten bellidir.

### Teşhis: bir şeyin framework mü kütüphane mi olduğunu sormadan anlamak

İyi haber: sormana gerek yok. Birkaç net ipucu var.

**A) "Getting Started" dokümanına bak (en garanti yol).** Teknolojinin sitesine ya
da GitHub'ına girip başlangıç bölümüne göz at:

- Doküman sana doğrudan `import teknoloji` yazdırıp kod başlatıyorsa →
  **kütüphane.**
- Doküman terminale `teknoloji-admin start` ya da `create-teknoloji-app` gibi bir
  komut yazdırıp otomatik klasörler oluşturuyorsa → **framework.**

**B) Sloganına bak.** Ana sayfadaki tanıtım cümlesi çoğu zaman kendini ele verir:

- "A Python **library** for data analysis" (Pandas) → kütüphane.
- "The web **framework** for perfectionists" (Django) → framework.

**C) "Kontrol kimde?" testi.** Zihinsel test şu: *"Ben mi onu çağırıyorum, o mu
beni çağırıyor?"*

- Kendi kodunun ortasında "şimdi şu veriyi oku" diye onu sen çağırıyorsan
  (`pd.read_csv()`) → **kütüphane.**
- Sen kodu yazıp bir köşeye koyuyorsan ve arkadaki motor onu uygun anda alıp
  çalıştırıyorsa → **framework.**

## 7. Peki Spark, Airflow, Kafka? Veri dünyasının ağır topları

Şimdi bu çerçeveyi veri mühendisliğinin en çok kullanılan araçlarına uygulayalım —
burada ilginç bir durum var. Kısa cevap: **Spark ve arkadaşlarının neredeyse hepsi
kütüphane değil, framework.** Büyük veri projelerinde tek bir dosya açıp kod
yazmanın yetmemesi, arkada bu frameworklerin çalışacağı koca bir sunucu sisteminin
(cluster / küme) kurulması tam da bu yüzdendir.

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

Hepsinin ortak noktası, yukarıdaki "kontrol kimde?" testini geçmeleri: sen "ne"
istediğini söylersin; "nasıl" kısmını — veriyi bölmek, sunuculara dağıtmak,
zamanlamak — motor kendisi halleder. Bu, tanımı gereği framework davranışıdır.

Bu büyük frameworklerin **içinde** ise daha dar işleri yapan kütüphaneler bulunur.
Örneğin Spark bir framework; ama Spark SQL (içinde SQL yazma), MLlib (makine
öğrenmesi) ve Spark Streaming (canlı akış) onun içindeki kütüphanelerdir. Fabrika
Spark'tır; içindeki bantlar ve robot kollar (MLlib, Spark SQL) kütüphanelerdir.

### İlginç kısım: bunların çoğu aslında bir *Python* frameworkü değil

Teşhis testinin ince yeri burası. "Spark bir Python frameworkü mü?" sorusunun
cevabı **tam olarak hayır.** Spark özünde **Scala ile yazılmıştır ve JVM (Java
Sanal Makinesi) üzerinde çalışır.** Ana vatanı Java/Scala dünyasıdır. Peki biz
nasıl Python ile Spark yazıyoruz? Araya **PySpark** giriyor:

- Kodunda `from pyspark.sql import SparkSession` yazarsın.
- Yazdığın Python, **Py4J** denen bir köprüyle arka planda Java/Scala koduna
  çevrilir.
- Asıl ağır işi — veriyi bölmek, işlemek — yine arkadaki JVM (Spark Core) yapar.
- Sonuç tekrar Python'a çevrilip sana sunulur.

Yani Spark teknik olarak bir **JVM frameworküdür**; `pip install pyspark` ile
kullandığın şey ise o devasa motoru Python'dan yönetmeni sağlayan bir **arayüz
(wrapper / API)**. Ama günün sonunda işini Python yazarak hallettiğin için ona
pratikte "Python ekosisteminin büyük veri frameworkü" demek de yanlış olmaz. Aynı
ayrım **Kafka** için de geçerli: Kafka da Java/Scala ile yazılmış bir platformdur;
Python'dan ona bağlanmak için `confluent-kafka` ya da `kafka-python` gibi **aracı
kütüphaneler** kullanırsın — kütüphane senin elinde, framework arkadaki sunucuda.

**dbt** ve **Airflow** ise madalyonun öbür yüzü: ikisi de **Python ile
yazılmıştır.** Ama bu onları "kütüphane" yapmaz — ikisi de frameworktür, çünkü
teşhis testlerini geçerler. dbt, `dbt init` ile katı bir klasör yapısı dayatır,
SQL'ini alıp derler (`dbt run`) ve veri ambarında çalıştırır. Airflow kodunu
`dags/` klasörüne yazdırır; arka planda kendi scheduler'ı, web sunucusu ve metadata
veritabanı sürekli çalışır, kodunun ne zaman çalışacağına sen değil o karar verir.
İkisinin kendi frameworke-bağımlı paketleri (kütüphaneleri) bile vardır: dbt'nin
`dbt-utils`'i, Django'nun DRF'i gibi, yalnızca dbt içinde `packages.yml`'a
yazılarak çalışır.

Kısacası "hangi dille yazıldığı" ile "framework mü kütüphane mi olduğu" birbirinden
ayrı sorulardır. Bir aracın dili, nerede yazıldığını söyler; framework mü kütüphane
mi olduğunu ise **kontrolün kimde olduğu** söyler.

## Özet

Baştaki sıralamaya dönersek: "Programlama dili > Framework > Kütüphane" **kapsam
ekseninde doğru** bir hiyerarşi. Unutulmaması gereken tek şey, framework ile
kütüphaneyi ayıran çizginin büyüklük değil **kontrol** olduğu.

- **Dil** temeldir; `print("deniz")` yazdığında ne framework ne kütüphane, yalnızca
  dili kullanırsın.
- **Kütüphane** bağımsız bir alettir — çoğu (Pandas) hiçbir frameworke ait
  değildir; sen çağırırsın, `import` edersin, akış sende kalır.
- **Framework** bir iskelettir — seni çağırır, kuralları o koyar, CLI ile kurulur;
  ama indirme tarafı kütüphaneyle aynıdır (`pip install`).
- **Bazı kütüphaneler** yalnızca belli bir framework içinde çalışır (DRF,
  Flask-SQLAlchemy, dbt-utils).
- **Framework mü kütüphane mi** sorusunu sormadan çözmenin yolu: getting-started
  dokümanı, slogan ve "kontrol kimde?" testi.
- **Spark, Flink, Kafka, Airflow, dbt** birer frameworktür; ama bir kısmı (Spark,
  Kafka) aslında JVM dünyasından gelir ve Python'a köprülerle bağlanır — dili nerede
  yazıldığını, kontrol ise framework mü kütüphane mi olduğunu belirler.

Bir dahaki sefere yeni bir araçla karşılaştığında, "acaba framework mü kütüphane
mi?" diye kime soracağını düşünmek yerine tek bir soru sor: **ben mi onu
çağırıyorum, o mu beni çağırıyor?** Gerisi kendiliğinden yerine oturur.
