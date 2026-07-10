---
title: 'Neden Hiçbir Dağıtık Sistem "CA" Olamaz? Borsa, Instagram ve LoL Üzerinden CAP''ten PACELC''e'
description: 'Canlı borsa verisi büyük veri midir ve binlerce sunucu aynı fiyatta nasıl anlaşır? Ağ bölünmesinde borsa neden CP seçer? "Sorun yokken sistem CA değil mi?" sorusunun cevabı neden PACELC? Işık hızı yüzünden saf bir CA neden fiziksel olarak imkânsız? Borsa, Instagram ve online oyunlar aynı fizik yasası altında tutarlılıkla gecikme arasında nasıl farklı seçimler yapıyor, ve borsa neden quorum''la bile yetinmiyor? CAP''ten PACELC''e, örneklerle baştan kurulan bir yazı.'
pubDate: 2026-07-11
tags: ['Dağıtık Sistemler', 'CAP Teoremi', 'PACELC', 'Tutarlılık', 'Consensus', 'Backend']
draft: false
---

Bir ekranda hisse fiyatının saniyeden küçük aralıklarla titreyip durduğunu düşünün. Arkada,
dünyanın dört bir yanındaki borsalarda salisede binlerce emir eşleşiyor, fiyat kesintisiz
akıyor. İnsanın ilk aklına gelen soru "bu kadar veri büyük veri mi?" oluyor. Ama o soruyu
geçtiğiniz an, çok daha ilginç bir mühendislik draması başlıyor: **binlerce sunucu, aynı
hissenin fiyatında, tam olarak aynı anda nasıl anlaşıyor?**

İşte dağıtık sistemlerin en meşhur teoremi — **CAP** — ve onun sık sık yanlış okunan hâli tam
burada devreye giriyor. Bu yazı, canlı borsa verisinden yola çıkıp CAP'i, onun kör noktasını,
yerine geçen **PACELC**'i ve "saf bir CA sistem neden imkânsız?" sorusunu baştan kurmayı
deniyor. Yol boyunca hep aynı üç sistemi yan yana tutacağız: **borsa, Instagram ve online
oyunlar** — çünkü üçü de aynı fizik yasasının altında, birbirine tam zıt tercihler yapıyor.

## Önce şu: canlı borsa verisi büyük veri mi?

Kısa cevap: kesinlikle evet — hatta büyük verinin en klasik örneklerinden biri. Bir verinin
"büyük veri" olup olmadığını sınayan **5V** çerçevesine oturttuğumuzda borsa verisi neredeyse
her maddeyi tek başına dolduruyor:

- **Velocity (Hız) — en belirleyici faktör.** Borsada hız her şeydir. NASDAQ, NYSE, BIST gibi
  borsalarda salisede binlerce işlem olur; fiyatlar gerçek zamanlı akar ve milisaniyelik bir
  gecikme (latency) bile milyonlarca dolarlık kazanca ya da kayba dönüşebilir.
- **Volume (Hacim).** Tek bir hissenin anlık fiyatı küçük görünür; ama binlerce hisse, endeks,
  kripto, emtia ve bunların emir defterleri (order book) bir araya gelince günlük
  terabaytlarca veri çıkar. Geriye dönük saklanınca dev bir havuz oluşur.
- **Variety (Çeşitlilik).** Borsa verisi sadece "Hisse X = 100 TL" değildir. Yapılandırılmış
  fiyat/hacim tablolarının yanında; KAP bildirimleri, şirket haberleri, yöneticilerin
  paylaşımları, finansal raporlar gibi yarı ve yapılandırılmamış veriyi de modern algoritmalar
  işler.
- **Veracity (Doğruluk).** Borsa verisinde hata payı olamaz — gelen veri manipüle edilmemiş,
  eksiksiz ve %100 doğru olmalı. Kirli ya da gecikmeli veri, finansal sistem için felakettir.
- **Value (Değer).** Bu veri işlendiği anda çok yüksek finansal değere dönüşür: algoritmik
  ticaret, risk yönetimi, fiyat tahmin modelleri tamamen bu veriden katma değer üretir.

Ama asıl mesele bunların hiçbiri değil. Borsayı zorlayan şey verinin *büyüklüğü* değil, o
verinin **her yerde aynı anda ve %100 doğru** olma zorunluluğudur. Ve işte tam bu zorunluluk,
dağıtık sistemlerin en temel ödünleşimine (trade-off) çarpar.

## CAP teoremi: bölünme anında zorunlu seçim

CAP teoremi üç şeyin baş harflerinden gelir:

- **C — Consistency (Tutarlılık):** Her okuma, en son yazılan veriyi görür. Hangi sunucuya
  sorarsanız sorun, cevap aynıdır.
- **A — Availability (Erişilebilirlik):** Her istek bir cevap alır; sistem "meşgulüm, sonra
  gel" demez, çalışmaya devam eder.
- **P — Partition Tolerance (Bölünmeye Dayanıklılık):** Sunucular arası iletişim koptuğunda
  (ağ bölünmesi) sistem yine de ayakta kalabilir.

Teoremin söylediği acımasız gerçek şu: **bir ağ bölünmesi (P) yaşandığında, C ile A'yı aynı
anda sağlayamazsınız.** İletişim koptuğu an ya tutarlılıktan ya da erişilebilirlikten
vazgeçmek zorundasınız. Borsa bu ikilemde net bir tarafı seçer: **CP** (Consistency +
Partition Tolerance). Yani bölünme anında borsa, erişilebilirliği feda edip tutarlılığı korur.

## Peki neden borsa CP seçer?

Cevabı görmek için tersini hayal etmek yeter. Borsa **AP** (erişilebilirliği önceleyen) bir
sistem olsaydı ne olurdu?

Ağ koptuğu hâlde her iki taraf da işlem almaya devam ederdi. A düğümündeki bir yatırımcı Apple
hissesini 150 dolardan satarken, iletişimi kopan B düğümündeki başka bir yatırımcı aynı hisseyi
hâlâ 148 dolardan görüp alabilirdi. Aynı hisse iki farklı kişiye mükerrer satılır, bakiyeler
senkronize olamaz, takas (clearing) çökerdi. Finansal bir felaket.

CP ise şöyle çalışır: iletişim koptuğu an sistem, ağın **çoğunluğu (quorum) sağlayamayan**,
izole kalmış tarafını işleme kapatır — yani erişilebilirliği feda eder. O tarafa düşen
yatırımcılar "sistem geçici olarak işlemlere kapatıldı" uyarısını görür. Amaç kesindir:
**senkronize olmamış, kuşkulu bir fiyattan işlem yapılmasını mutlak olarak engellemek.**

> Finansal sistemlerin altın kuralı: *geçici olarak hizmet verememek*, *tutarsız veriyle işlem
> yapmaktan* her zaman iyidir. Borsa ve bankacılık bu yüzden hep CP odaklı tasarlanır.

## "Sorun yokken sistem CA değil mi?" — CAP'in kör noktası

Burada çok doğal bir itiraz gelir: madem bölünme *anında* seçim yapılıyor, sistem sorunsuz
çalışırken hem tutarlı (C) hem erişilebilir (A) değil mi? Yani normal zamanda sistem aslında
**CA** değil mi?

Görünüşte öyle — ama CAP'in kurallarına göre değil. Önce bir yanlış anlamayı düzeltelim:
**CAP'teki P, "sistem şu an arızalı mı?" demek değildir; bir tasarım seçimidir.** Soru şudur:
"Ağ bölündüğünde bu sistem ayakta kalabilecek bir mimariye sahip mi?" Borsa gibi bir sistem
tek bir devasa bilgisayarda değil, yüzlerce sunuculu bir ağda çalışır; dolayısıyla ağ
bölünmesi bir ihtimal değil, bir **zaman meselesidir**. Sistem normal çalışırken hem C hem A
devrededir, ama bu onu "CA sistemi" yapmaz — çünkü gerçek bir CA sistem, bir bölünme yaşandığı
an *çökecek* olan, bölünmeyi hiç hesaba katmamış sistemdir. Borsa çökmez; ağı yöneterek güvenli
tarafta (CP) kalmayı seçer.

Peki normal zamanı ne açıklar? CAP bu konuda tamamen suskundur — işte kör noktası burasıdır.
Bu boşluğu dolduran teoremin adı **PACELC**.

## PACELC: normal zamanı da denkleme katmak

PACELC, CAP'i tek bir cümleyle genişletir:

```
if  P (Partition)  →  A ile C arasında seç
else (E, Else)     →  L (Latency) ile C (Consistency) arasında seç
```

Yani: ağ bölünmüşse (P) klasik CAP ikilemi geçerlidir, A mı C mi? Ama bölünme yoksa (Else)
bile elin rahat değildir: **düşük gecikme (L) mi, yoksa kesin tutarlılık (C) mi?** PACELC'in
dehası, "her şey yolundayken" bile bir bedel ödendiğini görmesidir. Çünkü bir sunucuya yazılan
verinin diğerlerine ulaşması sıfır zaman almaz; onları beklerseniz gecikirsiniz, beklemezseniz
bir an için tutarsız kalırsınız.

Bu çerçeveyle iki dünya netleşir:

- **Borsa (PC/EC):** Bölünmede de (PC), normal zamanda da (EC) tutarlılığı seçer. Sorun
  olmasa bile bir sunucudaki fiyatın tüm yedeklere (replica) yazıldığından emin olunmak
  istenir; herkesin %100 aynı fiyatı gördüğünden emin olmak için milisaniyelik onay süresi
  göze alınır.
- **Instagram (PA/EL):** Bölünmede erişilebilirliği (PA), normal zamanda düşük gecikmeyi (EL)
  seçer. Beğeni sayısının herkese anında %100 doğru gitmesi gerekmez; sistem hıza odaklanır,
  veriyi arkadan sessizce senkronize eder.

## Borsa vs Instagram: güçlü tutarlılık vs nihai tutarlılık

Bu iki tercih, dağıtık sistemlerde iki farklı **tutarlılık modeline** karşılık gelir.

**Borsa — Güçlü Tutarlılık (Strong Consistency).** Bir emir geldiğinde veri önce lider (leader)
sunucuya yazılır. Sistem, bu değişikliği tüm yedek sunuculara kopyalayıp onlardan "ben de
yazdım" onayını (acknowledge) alana kadar işlemi **bitmiş saymaz**. Bedeli gecikmedir; ama
finans için bu milisaniyelik gecikme, iki sunucuda iki farklı fiyatın görünmesi riskinden çok
daha kabul edilebilirdir.

**Instagram — Nihai Tutarlılık (Eventual Consistency).** Bir fotoğrafı beğendiğinizde veri size
en yakın sunucuya anında yazılır ve "beğenildi" cevabı hemen döner. Sistem, arkadaki yüzlerce
sunucunun da bunu işlemesini beklemez; onlar veriyi kendi aralarında yavaşça (arka planda,
milisaniyeler veya saniyeler içinde) eşitler. Arkadaşınız profilinize girdiğinde, bağlandığı
sunucu henüz güncellenmediyse o beğeniyi birkaç saniye gecikmeli görebilir. Veri o an
eksiktir — ama kimse para kaybetmez, sistem akmaya devam eder.

| Özellik | Borsa (PC/EC) | Instagram (PA/EL) |
| --- | --- | --- |
| **Öncelik** | Tutarlılık (Consistency) | Düşük gecikme / hız (Latency) |
| **Veri modeli** | Güçlü tutarlılık | Nihai tutarlılık (eventual) |
| **Normal zaman** | "Herkes aynı şeyi görene kadar onaylama" | "İşlemi hemen yap, ötekiler arkadan yetişir" |
| **Tolerans** | Gecikmeye var, hataya yok | Hataya/gecikmeye var, yavaşlığa yok |

## Aslında "CA" fiziksel olarak imkânsız

Buraya kadar "normal zamanda sistem CA gibi davranır" dedik. Ama işi sonuna kadar götürünce,
saf bir CA sistemin **normal zamanda bile** var olamayacağı ortaya çıkar. Üstelik bu bir
yazılım kısıtı değil, **fizik yasası.**

İki veri merkezinde çalışan **A** ve **B** sunucularını düşünün ve bu sistemin CA (hem %100
tutarlı hem %100 erişilebilir) olduğunu iddia edelim:

```
1. Ağ koptu (P)   →  A ile B arasındaki kablo koptu, konuşamıyorlar (fizik: kaçınılmaz)
2. İstek geldi    →  A'ya "fiyatı 100 → 105 yap" dendi. A erişilebilir olmak
                     zorunda, kabul eder. Değer artık 105.
3. Aynı an        →  Başka biri B'ye "fiyat kaç?" diye sordu. B, A'dan habersiz.
   ├─ B cevap verirse  →  eski 100'ü söyler. Sistem TUTARSIZ (A öldü, C öldü)
   └─ B susarsa        →  Sistem ERİŞİLEMEZ (A öldü, A öldü)
```

Kablo koptuğu an CA tasarımı matematiksel olarak çöker: sistem donup hafızasını kaybetmediği
sürece ya C'den ya A'dan vazgeçmek zorundadır. Peki bazı geleneksel veritabanları neden kendine
"CA" der? Çünkü onları **tek bir makineye (single node)** kurarsanız ortada ağ olmadığından
bölünme (P) de yaşanmaz — bu özel durumda sistem hem tutarlı hem erişilebilirdir. Ama konu
*dağıtık* sistemler olduğunda tanım gereği birden fazla makine vardır ve orada bölünme bir
ihtimal değil, zaman meselesidir.

Peki ya "istiyorsa nanosaniyelik gecikme olsun, normal zamanda CA vardır" dersek? O bile
tutmaz — çünkü o nanosaniye evrenin en temel kuralına takılır: **ışık hızı.** Veri A'dan B'ye
giderken fiber içinde ışık saniyede ~200.000 km yol alır; yani yan odadaki sunucuya ulaşması
bile sıfır değil, *bir miktar* zaman ister. O transfer süresince A güncellenmiş, B henüz
habersizdir — yani sistem teknik olarak tutarsızdır. "Aynı anlılık" iki farklı nokta için
fiziksel olarak yoktur; sıfır zamanlı senkronizasyon kuantum dolanıklığı gerektirirdi, ki
mevcut bilgisayar mimarilerinde böyle bir şey yok.

Üstüne bir de işletim sisteminin işlemci kuyrukları, ağ kartındaki paket kayıpları ve yeniden
gönderimler (TCP retransmission) eklenince, o "nanosaniye" her an mikro- veya milisaniyelere
fırlar. Dağıtık sistemlerin öncülerinden Leslie Lamport'un ünlü tarifi tam da bunu anlatır:

> "Dağıtık sistem; varlığından bile haberdar olmadığınız bir bilgisayarın çökmesiyle, kendi
> bilgisayarınızı kullanılamaz hâle getiren sistemdir."

CAP'in yaratıcısı Eric Brewer da yıllar sonra bunu itiraf etti: "CA seçeneği yanıltıcıdır;
çünkü bölünmeyi (P) görmezden gelme şansınız yoktur. Asıl seçim CP mi AP mi olacağıdır."
Kısacası "sistem düzgün çalışırken CA'dir" demek, dışarıdan bakan kullanıcının gördüğü bir
illüzyondur — kaputun altında CA yoktur, sadece **nanosaniyelere indirilmiş, çok iyi yönetilen
bir gecikme–tutarlılık savaşı** vardır.

## Online oyunlar (LoL, FIFA) hangi tarafı seçer?

Rekabetçi online oyunlar (LoL, Valorant, FIFA, CS) açık ara **AP / EL** dünyasını seçer. Sebep
basit: oyunda bir milisaniyelik *tutarsızlık* tolere edilebilir, ama bir milisaniyelik *donma*
oyuncu kaybettirir.

Ama önemli bir düzeltme gerekiyor: CAP ve PACELC, oyuncu ile sunucu arasını değil,
**sunucuların kendi arasındaki** senkronizasyonu konuşur. O yüzden meseleyi sunucu tarafında
kuralım. Oyun şirketleri (Riot, EA) tek bir devasa sunucu değil, her bölgede (EU West, TR, US
East) yük paylaşan dağıtık **sunucu cluster'ları** çalıştırır. Bu düğümlerin ilişkisinde de
tercih yine AP/EL'dir:

- **Eşleştirme ve lobi sunucuları:** Sıraya girdiğinizde veriniz en yakın lobi sunucusuna hemen
  yazılır (Latency önceliği); tüm yedeklere tam yazılması beklenmez. Bir senkron gecikmesi
  olursa arkadaşınızın "hazır" butonuna bastığını 200 ms geç görürsünüz — kabul edilebilir bir
  tutarsızlık. Ağ bölünürse (P) taraflar erişilebilir kalır (A): her düğüm kendi oyuncularını
  eşleştirmeye devam eder, ağ düzelince veriler birleşir.
- **Maç motoru (game server):** Asıl dehâ burada. Bir maç başladığı an **tek bir sunucu
  instance'ına kilitlenir (bind)**. Buna dağıtık sistemlerde *sharding* ya da *room-based
  isolation* denir. Maç sunucuları "Deniz'in canı kaç?" diye birbiriyle anlık senkronize
  olmaz; her maç o sunucunun RAM'inde tamamen izole yaşar ve biter. Sunucular arası anlık veri
  alışverişi, maçı yönetecek sunucu için bir darboğaz (bottleneck) olurdu.
- **Maç sonu yazımı:** Kazanan/kaybeden, XP/LP gibi kritik veri maç bitince ana veritabanına
  yazılır. Ama o anda bile veritabanı cluster'ında bir bölünme varsa sistem oyuncuyu bekletmez;
  "sen git, LP'ni arkadan (eventually) güncelleriz" der. Borsada ise o emir %100 yazılmadan asla
  yeni işleme geçilmezdi.

| | Borsa (PC/EC) | Online oyun (PA/EL) |
| --- | --- | --- |
| **Motto** | "Herkes aynı fiyatı görene kadar beklet, gerekirse dondur" | "Oyun hiç durmasın; arkada kalanı sonra düzeltiriz" |
| **Sunucular** | El ele tutuşup birlikte yürür (senkron) | Her düğüm kendi yolunda koşar (izole/eventual) |
| **Tutarsızlık** | Asla | Anlık kabul, sonradan düzeltme (rubberbanding) |

## Quorum: çoğunluk nasıl karar verir?

CP sistemlerin ve bölünmelerin kalbinde **quorum** yatar. Quorum (nisap/çoğunluk), bir işlemin
geçerli sayılması ya da bir kararın alınabilmesi için onay vermesi gereken **minimum sunucu
sayısıdır**. Mantığı meclisin toplantı yeter sayısıyla aynı: karar için üyelerin yarıdan
fazlası gerekir.

Formül, toplam sunucu `N` olmak üzere:

```
Q = ⌊ N / 2 ⌋ + 1
```

Bu yüzden dağıtık sistemlerde (Kafka, ZooKeeper, Raft, Paxos) sunucu sayıları neredeyse hep
**tek** seçilir. Sebebi bölünme anında kimin haklı olduğunu bulmaktır:

```
5 sunuculu cluster → quorum = ⌊5/2⌋ + 1 = 3
Ağ bölündü: bir yanda 3 sunucu, diğer yanda 2

3'lü taraf  →  "çoğunluğum (quorum var), işleme devam"
2'li taraf  →  "azınlığım (quorum yok), tutarsızlık yaratmamak için kilitleniyorum"
```

Modern NoSQL sistemlerinde (Cassandra, DynamoDB) quorum iki ayrı ayara döner: **Write Quorum
(W)** bir verinin "yazıldı" sayılması için kaç sunucunun kaydetmesi gerektiği; **Read Quorum
(R)** okurken kaç sunucudan doğrulama istendiği. Güçlü tutarlılığın altın kuralı:

```
W + R > N
```

Örneğin 3 sunuculu bir sistemde `W=2, R=2` seçilirse (2 + 2 > 3), her okumada en az bir tane
en güncel veriye sahip sunucuya denk gelmeniz **matematiksel olarak garanti** altına alınır.
Quorum olmasaydı, ağ ikiye bölününce her iki taraf da kendini lider ilan edebilir — buna
**split-brain (çift başlılık)** denir; borsada bu, ağ birleşince onarılamaz şekilde çöken bir
veritabanı demektir. Quorum sayesinde azınlık susar, tutarlılık korunur.

## Borsa quorum'la yetinir mi? Hayır — tam senkron ister

Şimdi ince ama kritik bir ayrım. Quorum, 5 sunucudan 3'ünün onayını yeterli görür; kalan 2'si
o an eski veride kalıp arkadan eşitlenebilir. **Borsa için bu bile yeterli değildir.**

Neden? A, B, C sunucuları bir emri onaylamış ama D ve E henüz habersizken, tam o mikro saniyede
A, B, C'nin bulunduğu veri merkezinin elektriği kesilirse — sistem CP gereği yeni işlem almayı
durdurur, doğru. Ama o üç sunucunun diski fiziksel olarak zarar gördüyse, onaylanmış (ve
kullanıcıya "gerçekleşti" denmiş) milyonlarca dolarlık emir, D ve E'de olmadığı için tamamen
kaybolur. Finansta buna **RPO (Recovery Point Objective) > 0** denir ve borsanın batması
demektir.

Bu yüzden borsalar, emir eşleştirme motorunun (matching engine) arkasında quorum'dan daha katı
bir modelle — **senkron replikasyon (synchronous replication)** — çalışır. Kafka diliyle
söylersek `acks=all`: bir işlem, gruptaki **tüm** birincil ve yedek sunuculara aynı anda
yazılır ve hepsi "diske kalıcı yazdım" demeden yatırımcıya "aldınız" bildirimi gitmez. Bu
sistemi yavaşlatır mı? Evet, gecikme artar. İşte bu yüzden borsalar sunucuları dünyaya yaymaz;
hepsini aynı veri merkezinde, ultra hızlı fiberle birbirine bağlı tutar ki senkron onayın
bedeli minimumda kalsın.

Peki quorum borsada hiç mi kullanılmaz? Kullanılır — ama **veri yazmak** için değil, **lider
seçmek** için. Lider sunucu çökerse ayakta kalanlar bir oylama yapar; çoğunluktaysalar (quorum)
aralarından en güncel veriye sahip olanı yeni lider seçer ve borsa çalışmaya devam eder.

> Veri güvenliği (transaction) için borsa quorum'la yetinmez, tüm kritik sunucuların %100
> senkronunu bekler. Quorum'u ise yalnızca lider çöktüğünde yeni lideri seçip split-brain'i
> önlemek için kullanır.

## Özet: "CA" bir efsane, asıl eksen tutarlılık–gecikme

Yolun başındaki soru "borsa verisi büyük veri mi?" idi; cevabı evetti ama asıl kapıyı o açtı.
Arkasından çıkan gerçek şu: **saf bir CA dağıtık sistem yoktur** — ne bölünme anında, ne de
"her şey yolundayken", çünkü ışık hızı bile sıfır zamanlı senkronizasyona izin vermez. CAP bu
yüzden yetersizdir; dünyaya siyah-beyaz bakar ("ya bölünme var ya kusursuzluk"), oysa sistemler
zamanın büyük kısmını normal çalışarak geçirir. O boşluğu dolduran **PACELC** daha doğru
çerçevedir: bölünmede A mı C mi, normal zamanda **L mi C mi**.

Geriye kalan tek gerçek eksen bu: **tutarlılık mı, gecikme mi?** Ve bu seçimi teori değil, işin
ihtiyacı belirler. Borsa "veri her yere hatasız yazılana kadar bekleyeceğim" der (PC/EC, senkron
replikasyon, gerekirse ekran donar). Instagram ve online oyunlar "akış hiç durmasın, arkada
kalanı sonra düzeltirim" der (PA/EL, nihai tutarlılık, rubberbanding). Aynı fizik yasası, aynı
CAP/PACELC ödünleşimi — ama üç farklı iş, üç farklı yanıt. "Her senaryoya uyan tek bir dağıtık
sistem yoktur" demenin en güzel kanıtı da budur.
