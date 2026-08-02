---
title: "Chicago'da Kaç Piyano Akortçusu Var? Fermi Problemleri ve Tahmin Sanatı"
description: 'Elinizde hiçbir veri, ölçüm aracı ya da kaynak yokken devasa bir soruya nasıl makul bir cevap verilir? Enrico Fermi, tam da bunu yapabilmesiyle tanınıyordu. Bu yazı Fermi problemlerinin ne olduğunu, ünlü piyano akortçusu sorusunun adım adım nasıl çözüldüğünü, bu yöntemin neden şaşırtıcı derecede isabetli sonuçlar verdiğini ve Google''dan McKinsey''e mülakatlarda neden hâlâ sorulduğunu ele alıyor — sonunda da aynı yöntemi bir veri mühendisliği kapasite hesabına uyguluyor.'
pubDate: 2026-08-02
tags: ['Fermi Problemleri', 'Tahmin', 'Problem Çözme', 'Mülakat', 'Kapasite Planlama', 'Veri Mühendisliği']
draft: false
---

"Chicago'da kaç piyano akortçusu vardır?" Bu soruya kimse ezberden doğru bir sayı
söyleyerek yanıt veremez. Google'da aratamadığınızı, elinizde hiçbir rehber, istatistik
ya da ölçüm aracı olmadığını düşünün. Çoğu insan bu noktada "bilinemez" der ve durur.
Oysa bu soru, doğru yöntemle birkaç dakika içinde — ve gerçek değere şaşırtıcı derecede
yakın biçimde — cevaplanabilir.

Bu yönteme **Fermi problemi** (ya da Fermi tahmini) deniyor. Bu yazı önce yöntemin
kendisini ve isim babasını tanıtıyor, sonra tarihin en ünlü örneğini adım adım çözüyor,
yöntemin neden işe yaradığını açıklıyor ve son olarak aynı düşünme biçiminin teknik
mülakatlarda ve veri mühendisliğinin gündelik işlerinde nasıl karşımıza çıktığını
gösteriyor.

## Fermi problemi nedir?

Adını, atom bombasının geliştirildiği Manhattan Projesi'nde de çalışan İtalyan-Amerikalı
fizikçi **Enrico Fermi**'den alır. Fermi, hiçbir veri veya kaynak olmadan, tamamen
mantıklı varsayımlar ve basit çarpma-bölme işlemleriyle isabetli tahminler
yapabilmesiyle tanınırdı. En bilinen anekdot, 1945'teki Trinity nükleer denemesinden:
Fermi, patlama dalgası kampa ulaştığında elindeki kâğıt parçalarını havaya bırakıp ne
kadar sürüklendiklerine bakarak bombanın gücünü yaklaşık 10 kiloton olarak tahmin etti —
haftalar süren resmî ölçümlerin vardığı sonuçla aynı mertebede.

Fermi problemi, bu yaklaşımın genel adıdır: **elinizde kesin bir veri ya da ölçüm aracı
yokken, devasa veya ölçülmesi zor bir soruya mantıklı adımlarla makul bir yaklaşık değer
bulma yöntemi.** İngilizce literatürde buna **back-of-the-envelope calculation** (zarf
arkası hesabı) da denir: hesap, bir zarfın arkasına sığacak kadar kısadır.

Yöntemin özü üç adımdır:

1. **Parçala:** Cevaplanamayan büyük soruyu, her biri tek başına tahmin edilebilir küçük
   sorulara böl.
2. **Varsay:** Her küçük soru için, savunabileceğin makul bir varsayım yap. Kesinlik
   değil, doğru **mertebe** (order of magnitude) hedefle.
3. **Birleştir:** Varsayımları çarpıp bölerek sonuca ulaş.

## Klasik örnek: Chicago'daki piyano akortçuları

Fermi'nin derslerinde öğrencilerine sorduğu rivayet edilen soru, bu işin tarihteki en
ünlü örneğidir. Çözüm, büyük soruyu beş küçük tahmine böler:

| Adım | Varsayım | Ara sonuç |
| --- | --- | --- |
| **Nüfus** | Chicago'da ~3.000.000 kişi yaşar | 3.000.000 kişi |
| **Hane sayısı** | Ortalama bir evde 4 kişi yaşar | ~750.000 hane |
| **Piyano sahipliği** | Her 15 haneden 1'inde piyano vardır | ~50.000 piyano |
| **Akort sıklığı** | Bir piyano yılda 1 kez akort edilir | Yılda 50.000 akort talebi |
| **Akortçu kapasitesi** | Günde 2 piyano × yılda 250 iş günü | Akortçu başına yılda 500 akort |

Sonuç: 50.000 / 500 = **yaklaşık 100 piyano akortçusu.**

İşin çarpıcı tarafı şu: gerçek rehber kayıtlarına bakıldığında Chicago'daki akortçu
sayısının 80–120 civarında olduğu görülmüştür. Hiçbir veriye bakmadan, beş kaba
varsayımla yapılan bir tahmin için bu, olağanüstü bir isabettir.

Buradaki hiçbir varsayım "doğru" değildir — hane başına tam 4 kişi düşmez, her piyano
her yıl akort edilmez. Ama hiçbirinin doğru olması da gerekmez. Önemli olan, her
varsayımın **savunulabilir bir aralıkta** kalmasıdır.

## Yöntem neden işe yarıyor: hatalar birbirini götürür

İlk bakışta bu bir çelişki gibi görünür: beş tane kaba tahmin üst üste binince hatanın
katlanması gerekmez mi? Gerçekte tam tersi olur ve bunun istatistiksel bir açıklaması
vardır.

Tahminlerin bir kısmı gerçek değerin üstünde, bir kısmı altında kalır. Piyano sahipliğini
olduğundan yüksek tahmin ettiyseniz, akort sıklığını olduğundan düşük tahmin etmiş
olabilirsiniz — çarpma işleminde bu iki hata **birbirini kısmen götürür.** Varsayım
sayısı arttıkça, hataların hepsinin aynı yönde olma olasılığı düşer. Tek bir dev tahmin
("bence 10.000 akortçu vardır") tek bir büyük hataya açıktır; beş küçük tahmin ise
hataları dağıtır ve dengeler.

İkinci neden, hedefin kendisidir. Fermi tahmini kesin sayı peşinde değildir; **doğru
mertebeyi** arar. "100 mü, 120 mi" sorusunun cevabı yanlış olabilir ama "100 mü, 10.000
mi" sorusununki neredeyse hiç şaşmaz. Gerçek hayatta kararların çoğu da zaten mertebe
sorusudur: bu iş bir kişilik mi, yüz kişilik mi; bu sistem bir sunucu mu ister, bin
sunucu mu?

> Fermi tahmininin gücü, isabetli varsayımlar yapmakta değil; problemi hataların
> birbirini dengeleyeceği kadar çok, ama her biri hâlâ sezgiyle tahmin edilebilecek
> kadar az parçaya bölmektedir.

## Mülakatlarda neden soruluyor?

Google, McKinsey, Amazon ve Wall Street şirketleri yıllardır mülakatlarda "Bir Boeing
747'ye kaç tenis topu sığar?" türü sorular soruyor. Bu soruları soran hiç kimse doğru
cevabı bildiğiniz için sormaz — çoğu zaman kesin bir doğru cevap yoktur. Görmek
istedikleri üç şey vardır:

- **Decomposition (parçalama):** Karmaşık ve belirsiz bir problemi, çözülebilir
  parçalara bölebiliyor musunuz? Bu, yazılım mimarisinden proje planlamasına her işin
  temel becerisidir.
- **Belirsizlik altında akıl yürütme:** Bilinmeyen bir durumda "bu bilinemez" deyip
  durmak yerine, savunabileceğiniz varsayımlar üretip ilerleyebiliyor musunuz?
- **Sayısal sezgi (numeracy):** Büyüklükler hakkında fikriniz var mı? Zihinden kaba
  hesap yapabiliyor, çıkan sonucun saçma olup olmadığını fark edebiliyor musunuz?

Mülakatçı için asıl sinyal, vardığınız sayı değil, oraya giden yolun kendisidir. "750.000
hane varsaydım çünkü nüfusu ortalama hane büyüklüğüne böldüm" diyen aday, doğru sayıyı
ezbere söyleyen adaydan daha değerlidir — çünkü ilki, hiç görmediği bir problemde de
aynı yöntemi uygulayabilir.

Popüler örneklerden birkaçı:

- "Bir Boeing 747 uçağının içine kaç tenis topu sığar?"
- "İstanbul'da bir günde kaç porsiyon döner tüketilir?"
- "Seattle'daki tüm binaların camlarını silmek için ne kadar ücret istersiniz?"
- "Dünyadaki tüm insanların saç tellerini uç uca eklesek Dünya ile Ay arasındaki
  mesafeyi kateder mi?"

## Veri mühendisliğinde Fermi: kapasite planlama

Bu blogun asıl konusuna bağlanan nokta şurası: veri mühendisliğinde Fermi tahmini bir
mülakat oyunu değil, **gündelik bir iş aracıdır.** "Bu sisteme ne kadar disk gerekir?",
"Kaç broker'lık bir Kafka cluster'ı kurmalıyız?", "Bu pipeline günde kaç event
taşıyacak?" sorularının hiçbirinin cevabı, sistem daha kurulmadan bir yerde yazmaz.
Cevap, tam bir Fermi hesabıyla bulunur.

Somut bir örnek: bir mobil uygulamanın event akışı için Kafka'ya ne kadar depolama
gerektiğini tahmin edelim.

1. **Kullanıcı:** Günlük aktif kullanıcı ~10 milyon olsun.
2. **Event üretimi:** Bir kullanıcı günde ortalama 100 event üretsin (ekran görüntüleme,
   tıklama, arama) → günde **1 milyar event.**
3. **Saniyelik hız:** 1 milyar / 86.400 saniye ≈ **12.000 event/saniye** ortalama.
   Trafik gün içinde eşit dağılmaz; tepe saatlerde 5 katını varsayalım →
   **~60.000 event/saniye** peak.
4. **Boyut:** Bir event ortalama 1 KB olsun → günde **~1 TB** ham veri.
5. **Replikasyon ve retention:** Kafka'da replication factor 3 ve 7 günlük retention
   varsayalım → 1 TB × 3 × 7 = **~21 TB** disk ihtiyacı.

Bu sayıların hiçbiri kesin değildir — ama kararı vermeye fazlasıyla yeter. 21 TB'lık bir
tahmin size "üç-beş makinelik bir cluster" der; hesap 2 PB çıksaydı bambaşka bir mimari
konuşuyor olurduk. Sistem canlıya çıkıp gerçek metrikler akmaya başladığında varsayımlar
ölçümlerle değiştirilir; ama ilk mimari karar, her zaman bir Fermi tahminiyle verilir.

> Kapasite planlamada tehlikeli olan yanlış tahmin değil, mertebesi yanlış tahmindir.
> Fermi yöntemi tam olarak bunu önler: 21 TB'ın gerçekte 30 TB çıkması sorun değildir;
> 21 TB beklerken 2 PB ile karşılaşmak ise bir mimari krizidir.

## Özet: bilmemek ile tahmin edememek aynı şey değil

Fermi problemleri, "bilinemez" görünen soruların çoğunun aslında **parçalanmamış**
sorular olduğunu gösterir. Chicago'daki akortçu sayısını kimse bilmez; ama Chicago'nun
nüfusunu, bir evde kaç kişinin yaşadığını, kaç evde piyano olabileceğini herkes kabaca
tahmin edebilir. Büyük soruyu bu küçük tahminlere bölüp çarptığınızda, hatalar
birbirini dengeler ve ortaya gerçeğe şaşırtıcı derecede yakın bir mertebe çıkar.

Mülakatlarda sorulmasının sebebi de, kapasite planlamada kullanılmasının sebebi de
aynıdır: gerçek dünyada kararların çoğu, verinin henüz var olmadığı anda verilir. O anda
elinizdeki tek araç, problemi parçalayıp savunulabilir varsayımlarla ilerleme
disiplinidir. Kesin sayıyı bilen değil, **doğru mertebeyi hızla bulabilen** kazanır.
