# 🎯 Remigo - Konum Bazlı Hatırlatıcı ve Alarm Uygulaması 🎯

**Remigo**, kullanıcıların belirli bir konuma yaklaştıklarında hatırlatma almasını sağlayan yenilikçi bir mobil uygulamadır. Bu uygulama sayesinde, örneğin bir kırtasiyenin önünden geçerken alışveriş listenizi hatırlatmak gibi konum tabanlı hatırlatıcılar oluşturabilirsiniz. Remigo, zaman ekleme zorunluluğu olmadan, sadece konumunuza bağlı hatırlatıcılar yaratmanıza olanak tanır.

## Kullanılan Teknolojiler ve Kütüphaneler

### Temel Teknolojiler

- **React Native**: Mobil uygulama geliştirmek için kullanılan popüler framework.
- **React Navigation**: Ekranlar arası gezinme sağlamak için kullanılan navigasyon kütüphanesi.
  - `@react-navigation/native`: Navigasyon çekirdeği.
  - `@react-navigation/stack`: Yığın tabanlı navigasyon sağlayan kütüphane.
- **Expo**: React Native projelerini hızlıca başlatmak için kullanılan araç.
- **JavaScript (ES6)**: Uygulamanın yazım dili.

### Konum Tabanlı Özellikler

- **React Native Geolocation Service**: Kullanıcının konumunu almak ve bu veriyi kullanarak alarm kurmak için kullanılan kütüphane.
- `@react-native-community/geolocation`: Konum verisini almak için kullanılan kütüphane.

### Animasyonlar ve Geçişler

- **React Native Animatable**: Animasyonlar oluşturmak ve geçişler eklemek için kullanılan kütüphane.
- **react-native-animatable**: Animasyonlu geçişler ve hareketli öğeler oluşturmak için.
- **React Native Animated**: Daha özelleştirilmiş animasyonlar için kullanılan kütüphane.
- **react-native**: Animasyon kontrolü ve düzenlemeleri için.

### UI ve Kullanıcı Deneyimi

- **React Native Paper**: Material Design bileşenlerini kullanarak modern ve temiz bir arayüz oluşturmak için.
- `react-native-paper`: UI bileşenleri sağlar, örneğin butonlar, kartlar, modal pencereler.
- **Expo Linear Gradient**: Renk geçişleri oluşturmak ve arka planlar için kullanılan kütüphane.
- `expo-linear-gradient`: Şık renk geçişleri oluşturmak için.
- **React Native Vector Icons**: Uygulama içerisinde ikonlar kullanmak için.
- `@expo/vector-icons`: Material, FontAwesome ve diğer ikon setlerini içerir.

## Uygulama Özellikleri

- **Konum Tabanlı Hatırlatıcılar**: Kullanıcılar, belirli bir konumda alarm kurarak hatırlatıcılar alabilirler.
- **Zaman Bağımsızlığı**: Hatırlatıcılar, sadece konumla tetiklenir, zaman eklemeye gerek yoktur.
- **Modern UI**: Kullanıcı dostu ve şık bir arayüz, Material Design bileşenleriyle desteklenmiştir.
- **Animasyonlar**: Kullanıcı etkileşimleriyle animasyonlu geçişler sağlanmıştır.
  
## Proje Ekran Görüntüleri

Aşağıda projenin bazı ekran görüntülerini bulabilirsiniz:

<img src="https://github.com/user-attachments/assets/524fe57d-8b5a-474b-a116-5d06f2cf40be"  width="250" >
<img src="https://github.com/user-attachments/assets/829bb1ad-6f0c-4bbf-9790-449a1f4bb79e"  width="250" >
<img src="https://github.com/user-attachments/assets/ffa56632-0671-4d43-beb5-66c2cac178fe"  width="250" >
<img src="https://github.com/user-attachments/assets/f6c54bdd-828d-4649-8196-a342da90be1b"  width="250" >

## Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları takip edebilirsiniz:

1. Repo'yu klonlayın:
    ```bash
    git clone https://github.com/ferhat/remigo-konum-bazli-hatirlatıcı.git
    ```

2. Proje dizinine gidin:
    ```bash
    cd remigo-konum-bazli-hatirlatıcı
    ```

3. Gerekli bağımlılıkları yükleyin:
    ```bash
    npm install
    ```

4. Expo projesini başlatın:
    ```bash
    expo start
    ```

5. Uygulamayı cihazınızda veya emülatörde görüntüleyebilirsiniz.

## Katkıda Bulunma

Katkıda bulunmak isterseniz, öncelikle bir **pull request** (PR) gönderin. Herhangi bir hata veya eksik özellik ile ilgili geri bildirimlerinizi de **issues** kısmında bildirebilirsiniz.
