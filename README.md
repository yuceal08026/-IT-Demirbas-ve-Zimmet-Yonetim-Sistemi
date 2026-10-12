# IT Demirbaş ve Zimmet Yönetim Sistemi

Kurum içi bilişim donanımlarının envanterini, personele zimmet/iade süreçlerini ve işlem geçmişini yöneten full-stack web uygulaması.

> Bu README Aşama 8'de tamamlanacaktır.

## Klasör yapısı

Ayrı klasörlü (monorepo olmayan) yapı seçildi; her parça kendi `package.json` dosyasıyla bağımsız kurulur ve Docker imajı alır.

```
.
├── backend/     Node.js + Express REST API, PostgreSQL migration'ları
├── frontend/    React (Vite) + Tailwind CSS arayüzü
├── docs/        Tasarım dokümanları (ERD, API, yetki haritası, güvenlik)
└── docker-compose.yml
```

## Kurulum

### Docker ile

### Docker olmadan (geliştirme)

## Ortam değişkenleri

## Varsayılan yönetici hesabı

## Testler
