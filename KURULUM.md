# Just Act Now Studio — Vercel kurulumu

Bu klasör sitenin tamamıdır: stüdyo sayfası, şifreli giriş, kayıt ve video saklama için sunucu kodu,
85 hazır söz ve 16 hazır video.

## Gerekenler

1. **Blob deposu.** Vercel'de projeyi aç, Storage bölümünden bir **Blob** deposu oluştur ve projeye bağla.
   Bağlayınca projeye depo değişkenleri kendiliğinden eklenir. Yeni depolarda bunlar `BLOB_STORE_ID` ve
   `BLOB_WEBHOOK_PUBLIC_KEY` olur; eski tip depolarda `BLOB_READ_WRITE_TOKEN` olur. Site ikisiyle de çalışır.
   Depo herkese açık (public) ya da özel (private) olabilir; site hangisi olduğunu kendisi anlar.
2. **Şifre.** Settings > Environment Variables bölümüne `STUDIO_PASSWORD` adında bir değişken ekle.
   Değeri senin belirlediğin şifredir; en az 8 karakter olmalı. Şifreyi kimseyle ve hiçbir sohbette paylaşma.
3. **Yayın.** Proje GitHub'a bağlı: dosyaları depoya (repo) yükleyip `main` dalına gönderince Vercel kendiliğinden
   yeniden yayınlar. Değişkenleri sonradan değiştirdiysen bir kez Redeploy yap.

## İlk açılış

Site şifre sorar. Giriş yapınca 85 söz ve 16 video kendiliğinden yüklenir ve depoya kaydedilir.
Bundan sonra yaptığın her değişiklik (yeni söz, paylaşıldı tikleri, açıklamalar, ürettiğin videolar) sitede saklanır.

## Sorun çıkarsa

Stüdyonun üstünde sarı bir kutu belirir ve sunucunun verdiği yanıtı yazar. O yazıyı aynen ilet.
- "No blob credentials" yazıyorsa: Settings > Security bölümündeki "Secure Backend Access with OIDC Federation"
  ayarını aç ve yeniden yayınla.
- Depo değişkenleri yalnızca bağlandıkları ortamlarda (Production, Preview) görünür; `STUDIO_PASSWORD` da
  aynı ortamda tanımlı olmalı.

## Bilmen gerekenler

- Şifreyi değiştirmek için `STUDIO_PASSWORD` değerini değiştirip yeniden yayınla; açık oturumlar kapanır.
- Herkese açık depoda videolar tahmin edilemeyen ama açık adreslerde durur; adresi bilen izleyebilir.
  Özel depoda videolar yalnızca giriş yapmış oturumda oynar.
- Hazır 16 video `seed/` klasöründen sunulur; bu klasörü silersen o videolar oynamaz.
- "Claude ile yaz" düğmesi yalnızca Claude içindeki stüdyoda vardır; bu sitede açıklamalar hazır şablonla gelir.
- Kendi yüklediğin şarkılar ve videodan çıkardığın sesler yalnızca kullandığın tarayıcıda saklanır.
