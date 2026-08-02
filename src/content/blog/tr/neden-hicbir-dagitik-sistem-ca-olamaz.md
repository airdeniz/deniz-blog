---
title: 'Neden Hiçbir Dağıtık Sistem "CA" Olamaz? Borsa, Instagram ve LoL ile CAP''ten PACELC''e'
description: 'Binlerce sunucu aynı hissenin fiyatında nasıl anlaşır? Borsa, Instagram ve online oyunları yan yana koyarak CAP teoremini, kör noktasını ve yerini alan PACELC''i baştan kuruyoruz: ağ bölündüğünde neden C ile A''dan biri feda edilir, "sorun yokken sistem CA değil mi?" itirazı neden tutmaz, ışık hızı saf bir CA sistemi neden fiziksel olarak imkânsız kılar ve borsa neden quorum''la bile yetinmez?'
pubDate: 2026-07-11
tags: ['Dağıtık Sistemler', 'CAP Teoremi', 'PACELC', 'Tutarlılık', 'Consensus', 'Backend']
draft: false
---

Bir ekranda hisse fiyatının saniyeden kısa aralıklarla değiştiğini düşünün. Arkada, dünyanın
dört bir yanındaki borsalarda salisede binlerce emir eşleşiyor ve fiyat kesintisiz akıyor.
İlk akla gelen soru genellikle "bu kadar veri büyük veri mi?" oluyor. Oysa o sorunun hemen
arkasında çok daha ilginç bir mühendislik problemi duruyor: **binlerce sunucu, aynı hissenin
fiyatında, tam olarak aynı anda nasıl anlaşıyor?**

Dağıtık sistemlerin en meşhur teoremi — **CAP** — ve onun sık sık yanlış okunan hâli tam
burada devreye giriyor. Bu yazı canlı borsa verisinden yola çıkıyor; CAP'i, teoremin kör
noktasını, yerini alan **PACELC**'i ve "saf bir CA sistem neden imkânsız?" sorusunu baştan
kuruyor. Yol boyunca aynı üç sistemi yan yana tutacağız: **borsa, Instagram ve online
oyunlar**. Çünkü üçü de aynı fizik yasasının altında çalışıyor ama birbirine tam zıt
tercihler yapıyor.

## Önce şu: canlı borsa verisi büyük veri mi?

Kısa cevap: kesinlikle evet — hatta büyük verinin ders kitabı örneklerinden biri. Bir verinin
"büyük veri" sayılıp sayılmayacağını sınayan **5V** çerçevesine oturtulduğunda, borsa verisi
neredeyse her maddeyi tek başına karşılıyor:

- **Velocity (Hız) — en belirleyici faktör.** Borsada hız her şeydir. NASDAQ, NYSE, BIST gibi
  borsalarda salisede binlerce işlem gerçekleşir; fiyatlar gerçek zamanlı akar ve milisaniyelik
  bir gecikme (latency) bile milyonlarca dolarlık kazanca ya da kayba dönüşebilir.
- **Volume (Hacim).** Tek bir hissenin anlık fiyatı küçük görünür; ama binlerce hisse, endeks,
  kripto, emtia ve bunların emir defterleri (order book) bir araya geldiğinde günde
  terabaytlarca veri üretilir. Geriye dönük saklandığında ortaya dev bir havuz çıkar.
- **Variety (Çeşitlilik).** Borsa verisi yalnızca "Hisse X = 100 TL" değildir. Yapılandırılmış
  fiyat/hacim tablolarının yanında modern algoritmalar KAP bildirimleri, şirket haberleri,
  yönetici paylaşımları ve finansal raporlar gibi yarı yapılandırılmış ve yapılandırılmamış
  veriyi de işler.
- **Veracity (Doğruluk).** Borsa verisinde hata payı yoktur — gelen veri manipüle edilmemiş,
  eksiksiz ve %100 doğru olmalıdır. Kirli ya da gecikmeli veri, finansal bir sistem için
  felaket demektir.
- **Value (Değer).** Bu veri işlendiği anda yüksek finansal değere dönüşür: algoritmik ticaret,
  risk yönetimi ve fiyat tahmin modelleri katma değerini tamamen bu veriden üretir.

Ama asıl mesele bunların hiçbiri değil. Borsayı zorlayan şey verinin *büyüklüğü* değil, o
verinin **her yerde, aynı anda ve %100 doğru** olma zorunluluğudur. İşte bu zorunluluk,
dağıtık sistemlerin en temel ödünleşimine (trade-off) çarpar.

## CAP teoremi: bölünme anında zorunlu seçim

CAP, üç kavramın baş harflerinden gelir:

- **C — Consistency (Tutarlılık):** Her okuma, en son yazılan veriyi görür. Hangi sunucuya
  sorarsanız sorun, cevap aynıdır.
- **A — Availability (Erişilebilirlik):** Her istek bir cevap alır; sistem "meşgulüm, sonra
  gel" demez, çalışmaya devam eder.
- **P — Partition Tolerance (Bölünmeye Dayanıklılık):** Sunucular arasındaki iletişim
  koptuğunda (ağ bölünmesi) sistem yine de ayakta kalabilir.

Teoremin acımasız gerçeği şudur: **bir ağ bölünmesi (P) yaşandığında, C ile A'yı aynı anda
sağlayamazsınız.** İletişim koptuğu an ya tutarlılıktan ya da erişilebilirlikten vazgeçmek
zorundasınız. Borsa bu ikilemde tarafını net seçer: **CP** (Consistency + Partition
Tolerance). Bölünme anında borsa, erişilebilirliği feda edip tutarlılığı korur.

## Peki borsa neden CP seçer?

Cevabı görmek için tersini hayal etmek yeterli. Borsa **AP** (erişilebilirliği önceleyen) bir
sistem olsaydı ne olurdu?

Ağ koptuğu hâlde her iki taraf da işlem kabul etmeye devam ederdi. A düğümündeki bir yatırımcı
Apple hissesini 150 dolardan satarken, iletişimi kopan B düğümündeki bir başkası aynı hisseyi
hâlâ 148 dolardan görüp satın alabilirdi. Aynı hisse iki kişiye mükerrer satılır, bakiyeler
senkronize edilemez, takas (clearing) çöker. Finansal bir felaket.

CP ise şöyle çalışır: iletişim koptuğu an sistem, **çoğunluğu (quorum) sağlayamayan**, izole
kalmış tarafı işleme kapatır — yani erişilebilirliği feda eder. O tarafa düşen yatırımcılar
"sistem geçici olarak işlemlere kapatıldı" uyarısını görür. Amaç kesindir: **senkronize
olmamış, kuşkulu bir fiyattan işlem yapılmasını mutlak olarak engellemek.**

> Finansal sistemlerin altın kuralı: *geçici olarak hizmet verememek*, *tutarsız veriyle
> işlem yapmaktan* her zaman iyidir. Borsa ve bankacılık bu yüzden hep CP odaklı tasarlanır.

## "Sorun yokken sistem CA değil mi?" — CAP'in kör noktası

Burada çok doğal bir itiraz gelir: madem seçim bölünme *anında* yapılıyor, sistem sorunsuz
çalışırken hem tutarlı (C) hem erişilebilir (A) değil mi? Yani normal zamanda sistem aslında
**CA** olmuyor mu?

Görünüşte öyle — ama CAP'in kurallarına göre değil. Önce bir yanlış anlamayı düzeltelim:
**CAP'teki P, "sistem şu an arızalı mı?" sorusu değil, bir tasarım seçimidir.** Asıl soru
şudur: "Ağ bölündüğünde bu sistem ayakta kalabilecek bir mimariye sahip mi?" Borsa gibi bir
sistem tek bir devasa bilgisayarda değil, yüzlerce sunuculu bir ağda çalışır; dolayısıyla ağ
bölünmesi bir ihtimal değil, bir **zaman meselesidir**. Sistem normal çalışırken hem C hem A
devrededir; ama bu onu "CA sistemi" yapmaz. Çünkü gerçek bir CA sistem, bölünmeyi hiç hesaba
katmamış, bir bölünme yaşandığı an *çökecek* olan sistemdir. Borsa çökmez; ağı yöneterek
güvenli tarafta (CP) kalmayı seçer.

Peki normal zamanı ne açıklar? CAP bu konuda tamamen sessizdir — kör noktası da tam burasıdır.
Bu boşluğu dolduran teoremin adı **PACELC**.

## PACELC: normal zamanı da denkleme katmak

PACELC, CAP'i tek bir cümleyle genişletir:

```
if  P (Partition)  →  A ile C arasında seç
else (E, Else)     →  L (Latency) ile C (Consistency) arasında seç
```

Yani: ağ bölünmüşse (P) klasik CAP ikilemi geçerlidir — A mı, C mi? Ama bölünme yokken (Else)
bile eliniz rahat değildir: **düşük gecikme (L) mi, kesin tutarlılık (C) mi?** PACELC'in asıl
katkısı, "her şey yolundayken" bile bir bedel ödendiğini görmesidir. Çünkü bir sunucuya
yazılan verinin diğerlerine ulaşması sıfır zaman almaz; onları beklerseniz gecikirsiniz,
beklemezseniz bir an için tutarsız kalırsınız.

Bu çerçeveyle iki dünya netleşir:

- **Borsa (PC/EC):** Bölünmede de (PC), normal zamanda da (EC) tutarlılığı seçer. Ortada bir
  sorun yokken bile, bir sunucudaki fiyatın tüm yedeklere (replica) yazıldığından emin olunmak
  istenir; herkesin %100 aynı fiyatı görmesi için milisaniyelik onay süresi göze alınır.
- **Instagram (PA/EL):** Bölünmede erişilebilirliği (PA), normal zamanda düşük gecikmeyi (EL)
  seçer. Beğeni sayısının herkese anında ve %100 doğru ulaşması gerekmez; sistem hıza
  odaklanır, veriyi arka planda sessizce senkronize eder.

## Borsa vs Instagram: güçlü tutarlılık vs nihai tutarlılık

Bu iki tercih, dağıtık sistemlerdeki iki farklı **tutarlılık modeline** karşılık gelir.

**Borsa — Güçlü Tutarlılık (Strong Consistency).** Bir emir geldiğinde veri önce lider
(leader) sunucuya yazılır. Sistem, değişikliği tüm yedek sunuculara kopyalayıp her birinden
"ben de yazdım" onayını (acknowledge) alana kadar işlemi **bitmiş saymaz**. Bedeli gecikmedir;
ama finans için bu milisaniyelik bekleme, iki sunucuda iki farklı fiyatın görünmesi riskinden
çok daha kabul edilebilirdir.

**Instagram — Nihai Tutarlılık (Eventual Consistency).** Bir fotoğrafı beğendiğinizde veri
size en yakın sunucuya anında yazılır ve "beğenildi" cevabı hemen döner. Sistem, arkadaki
yüzlerce sunucunun da bunu işlemesini beklemez; onlar veriyi kendi aralarında arka planda,
milisaniyeler veya saniyeler içinde eşitler. Arkadaşınız profilinize girdiğinde, bağlandığı
sunucu henüz güncellenmediyse o beğeniyi birkaç saniye gecikmeli görebilir. Veri o an
eksiktir — ama kimse para kaybetmez ve sistem akmaya devam eder.

| Özellik | Borsa (PC/EC) | Instagram (PA/EL) |
| --- | --- | --- |
| **Öncelik** | Tutarlılık (Consistency) | Düşük gecikme / hız (Latency) |
| **Veri modeli** | Güçlü tutarlılık | Nihai tutarlılık (eventual) |
| **Normal zaman** | "Herkes aynı şeyi görene kadar onaylama" | "İşlemi hemen yap, ötekiler arkadan yetişir" |
| **Tolerans** | Gecikmeye var, hataya yok | Hataya/gecikmeye var, yavaşlığa yok |

## Aslında "CA" fiziksel olarak imkânsız

Buraya kadar "normal zamanda sistem CA gibi davranır" dedik. Ama işi sonuna kadar
götürdüğümüzde, saf bir CA sistemin **normal zamanda bile** var olamayacağı ortaya çıkıyor.
Üstelik bu bir yazılım kısıtı değil, **fizik yasası.**

İki veri merkezinde çalışan **A** ve **B** sunucularını düşünün ve bu sistemin CA (hem %100
tutarlı hem %100 erişilebilir) olduğunu iddia edelim:

```
1. Ağ koptu (P)   →  A ile B arasındaki kablo koptu, konuşamıyorlar (fizik: kaçınılmaz)
2. İstek geldi    →  A'ya "fiyatı 100 → 105 yap" dendi. A erişilebilir olmak
                     zorunda, kabul eder. Değer artık 105.
3. Aynı an        →  Başka biri B'ye "fiyat kaç?" diye sordu. B, A'dan habersiz.
   ├─ B cevap verirse  →  eski 100'ü söyler. Sistem TUTARSIZ (C düştü)
   └─ B susarsa        →  Sistem ERİŞİLEMEZ (A düştü)
```

Kablo koptuğu an CA tasarımı matematiksel olarak çöker: sistem donup hafızasını kaybetmediği
sürece ya C'den ya A'dan vazgeçmek zorundadır. Peki bazı geleneksel veritabanları kendine
neden "CA" der? Çünkü **tek bir makineye (single node)** kurulduklarında ortada ağ olmadığı
için bölünme (P) de yaşanmaz — bu özel durumda sistem hem tutarlı hem erişilebilirdir. Ama
konu *dağıtık* sistemler olduğunda tanım gereği birden fazla makine vardır; orada bölünme bir
ihtimal değil, zaman meselesidir.

Peki ya "varsın nanosaniyelik gecikme olsun, normal zamanda CA vardır" dersek? O bile tutmaz —
çünkü o nanosaniye evrenin en temel kuralına takılır: **ışık hızı.** Veri A'dan B'ye giderken
ışık fiber içinde saniyede yaklaşık 200.000 km yol alır; yan odadaki sunucuya ulaşmak bile
sıfır değil, *bir miktar* zaman ister. O transfer süresince A güncellenmiş, B henüz
habersizdir — yani sistem teknik olarak tutarsızdır. İki farklı nokta için "aynı anlılık"
fiziksel olarak yoktur; sıfır zamanlı senkronizasyon kuantum dolanıklığı gerektirirdi, ki
mevcut bilgisayar mimarilerinde böyle bir mekanizma yok.

Üstüne işletim sisteminin işlemci kuyrukları, ağ kartındaki paket kayıpları ve yeniden
gönderimler (TCP retransmission) eklendiğinde, o "nanosaniye" her an mikro- veya
milisaniyelere çıkabilir. Dağıtık sistemlerin öncülerinden Leslie Lamport'un ünlü tarifi tam
da bunu anlatır:

> "Dağıtık sistem; varlığından bile haberdar olmadığınız bir bilgisayarın çökmesiyle, kendi
> bilgisayarınızı kullanılamaz hâle getiren sistemdir."

CAP'in yaratıcısı Eric Brewer da yıllar sonra bunu kabul etti: "CA seçeneği yanıltıcıdır;
çünkü bölünmeyi (P) görmezden gelme şansınız yoktur. Asıl seçim CP mi AP mi olacağıdır."
Kısacası "sistem düzgün çalışırken CA'dir" demek, dışarıdan bakan kullanıcının gördüğü bir
illüzyondur — kaputun altında CA yoktur; **nanosaniyelere indirilmiş, çok iyi yönetilen bir
gecikme–tutarlılık ödünleşimi** vardır.

## Online oyunlar (LoL, FIFA) hangi tarafı seçer?

Rekabetçi online oyunlar (LoL, Valorant, FIFA, CS) açık ara **AP / EL** dünyasını seçer.
Sebebi basit: oyunda bir milisaniyelik *tutarsızlık* tolere edilebilir, ama bir milisaniyelik
*donma* oyuncuya maçı kaybettirir.

Yalnız önemli bir düzeltme gerekiyor: CAP ve PACELC, oyuncu ile sunucu arasındaki ilişkiyi
değil, **sunucuların kendi aralarındaki** senkronizasyonu konuşur. O yüzden meseleyi sunucu
tarafında kuralım. Oyun şirketleri (Riot, EA) tek bir devasa sunucu değil, her bölgede (EU
West, TR, US East) yükü paylaşan dağıtık **sunucu cluster'ları** çalıştırır. Bu düğümler
arasındaki ilişkide de tercih yine AP/EL'dir:

- **Eşleştirme ve lobi sunucuları:** Sıraya girdiğinizde veriniz en yakın lobi sunucusuna
  hemen yazılır (Latency önceliği); tüm yedeklere tam olarak yazılması beklenmez. Bir senkron
  gecikmesi olursa arkadaşınızın "hazır" butonuna bastığını 200 ms geç görürsünüz — kabul
  edilebilir bir tutarsızlık. Ağ bölünürse (P) taraflar erişilebilir kalır (A): her düğüm
  kendi oyuncularını eşleştirmeye devam eder, ağ düzelince veriler birleşir.
- **Maç motoru (game server):** Asıl incelik burada. Bir maç başladığı an **tek bir sunucu
  instance'ına kilitlenir (bind)**. Dağıtık sistemlerde buna *sharding* ya da *room-based
  isolation* denir. Maç sunucuları "Deniz'in canı kaç?" diye birbiriyle anlık senkronize
  olmaz; her maç, o sunucunun RAM'inde tamamen izole yaşar ve biter. Sunucular arası anlık
  veri alışverişi, maçı yöneten sunucu için bir darboğaz (bottleneck) olurdu.
- **Maç sonu yazımı:** Kazanan/kaybeden, XP/LP gibi kritik veriler maç bitince ana veritabanına
  yazılır. Ama o anda veritabanı cluster'ında bir bölünme olsa bile sistem oyuncuyu bekletmez;
  "sen git, LP'ni arkadan (eventually) güncelleriz" der. Borsada ise o emir %100 yazılmadan
  asla yeni işleme geçilmezdi.

| | Borsa (PC/EC) | Online oyun (PA/EL) |
| --- | --- | --- |
| **Motto** | "Herkes aynı fiyatı görene kadar beklet, gerekirse dondur" | "Oyun hiç durmasın; arkada kalanı sonra düzeltiriz" |
| **Sunucular** | El ele tutuşup birlikte yürür (senkron) | Her düğüm kendi yolunda koşar (izole/eventual) |
| **Tutarsızlık** | Asla | Anlık kabul, sonradan düzeltme (rubberbanding) |

## Quorum: çoğunluk nasıl karar verir?

CP sistemlerin ve bölünmelerin kalbinde **quorum** yatar. Quorum (nisap/çoğunluk), bir
işlemin geçerli sayılması ya da bir kararın alınabilmesi için onay vermesi gereken **minimum
sunucu sayısıdır**. Mantığı meclisin toplantı yeter sayısıyla aynıdır: karar için üyelerin
yarıdan fazlası gerekir.

Formül, toplam sunucu sayısı `N` olmak üzere:

```
Q = ⌊ N / 2 ⌋ + 1
```

Bu yüzden dağıtık sistemlerde (Kafka, ZooKeeper, Raft, Paxos) sunucu sayısı neredeyse hep
**tek** seçilir. Amaç, bölünme anında kimin haklı olduğunu belirleyebilmektir:

```
5 sunuculu cluster → quorum = ⌊5/2⌋ + 1 = 3
Ağ bölündü: bir yanda 3 sunucu, diğer yanda 2

3'lü taraf  →  "çoğunluğum (quorum var), işleme devam"
2'li taraf  →  "azınlığım (quorum yok), tutarsızlık yaratmamak için kilitleniyorum"
```

Modern NoSQL sistemlerinde (Cassandra, DynamoDB) quorum iki ayrı ayara dönüşür: **Write
Quorum (W)**, bir verinin "yazıldı" sayılması için kaç sunucunun kaydetmesi gerektiği; **Read
Quorum (R)**, okuma sırasında kaç sunucudan doğrulama istendiği. Güçlü tutarlılığın altın
kuralı:

```
W + R > N
```

Örneğin 3 sunuculu bir sistemde `W=2, R=2` seçilirse (2 + 2 > 3), her okumada en güncel
veriye sahip en az bir sunucuya denk gelmeniz **matematiksel olarak garanti** edilir. Quorum
olmasaydı, ağ ikiye bölündüğünde her iki taraf da kendini lider ilan edebilirdi — buna
**split-brain (çift başlılık)** denir; borsada bu, ağ birleştiğinde onarılamaz biçimde çöken
bir veritabanı demektir. Quorum sayesinde azınlık susar, tutarlılık korunur.

## Borsa quorum'la yetinir mi? Hayır — tam senkron ister

Şimdi ince ama kritik bir ayrım. Quorum, 5 sunucudan 3'ünün onayını yeterli görür; kalan 2'si
o an eski veride kalıp arkadan eşitlenebilir. **Borsa için bu bile yeterli değildir.**

Neden? A, B, C sunucuları bir emri onaylamış ama D ve E henüz habersizken, tam o mikro
saniyede A, B, C'nin bulunduğu veri merkezinin elektriği kesilirse — sistem CP gereği yeni
işlem almayı durdurur, doğru. Ama o üç sunucunun diski fiziksel olarak zarar gördüyse,
onaylanmış (ve kullanıcıya "gerçekleşti" denmiş) milyonlarca dolarlık emir, D ve E'de
bulunmadığı için tamamen kaybolur. Finansta buna **RPO (Recovery Point Objective) > 0** denir
ve bir borsa için yıkım anlamına gelir.

Bu yüzden borsalar, emir eşleştirme motorunun (matching engine) arkasında quorum'dan daha
katı bir modelle — **senkron replikasyon (synchronous replication)** — çalışır. Kafka diliyle
söylersek `acks=all`: bir işlem, gruptaki **tüm** birincil ve yedek sunuculara aynı anda
yazılır ve hepsi "diske kalıcı olarak yazdım" demeden yatırımcıya "gerçekleşti" bildirimi
gitmez. Bu sistemi yavaşlatır mı? Evet, gecikme artar. İşte tam bu yüzden borsalar sunucuları
dünyaya yaymaz; hepsini aynı veri merkezinde, ultra hızlı fiberle birbirine bağlı tutar ki
senkron onayın bedeli minimumda kalsın.

Peki quorum borsada hiç mi kullanılmaz? Kullanılır — ama **veri yazmak** için değil, **lider
seçmek** için. Lider sunucu çökerse ayakta kalanlar oylama yapar; çoğunluktaysalar (quorum)
aralarından en güncel veriye sahip olanı yeni lider seçer ve borsa çalışmaya devam eder.

> Veri güvenliği (transaction) için borsa quorum'la yetinmez; tüm kritik sunucuların %100
> senkronunu bekler. Quorum'u yalnızca lider çöktüğünde yeni lideri seçmek ve split-brain'i
> önlemek için kullanır.

## Özet: "CA" bir efsane, asıl eksen tutarlılık–gecikme

Yolun başındaki soru "borsa verisi büyük veri mi?" idi; cevap evetti ama asıl kapıyı o soru
açtı. Ardından çıkan gerçek şu: **saf bir CA dağıtık sistem yoktur** — ne bölünme anında, ne
de "her şey yolundayken." Çünkü ışık hızı bile sıfır zamanlı senkronizasyona izin vermez. CAP
bu yüzden yetersizdir; dünyaya siyah-beyaz bakar ("ya bölünme var ya kusursuzluk"), oysa
sistemler zamanın büyük kısmını normal çalışarak geçirir. O boşluğu dolduran **PACELC** daha
doğru çerçevedir: bölünmede A mı C mi, normal zamanda **L mi C mi**.

Geriye tek bir gerçek eksen kalır: **tutarlılık mı, gecikme mi?** Bu seçimi de teori değil,
işin ihtiyacı belirler. Borsa "veri her yere hatasız yazılana kadar beklerim" der (PC/EC,
senkron replikasyon, gerekirse ekran donar). Instagram ve online oyunlar "akış hiç durmasın,
arkada kalanı sonra düzeltirim" der (PA/EL, nihai tutarlılık, rubberbanding). Aynı fizik
yasası, aynı CAP/PACELC ödünleşimi — ama üç farklı iş, üç farklı yanıt. "Her senaryoya uyan
tek bir dağıtık sistem yoktur" sözünün en güzel kanıtı da budur.
