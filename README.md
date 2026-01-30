# Kamer-Pro: Premium Property Booking Platform

Kamer-Pro is a modern, high-performance full-stack property booking and management platform (similar to Airbnb). It provides a seamless experience for both guests looking for accommodations and hosts managing their properties. Built with a focus on speed, security, and user experience, it leverages a powerful Rust backend and a dynamic React frontend.

## 🌟 Key Features

### For Guests
- **Smart Search**: Find properties by location, town, and specific criteria.
- **Detailed Listings**: High-quality photo galleries, amenity lists, and verified reviews.
- **Seamless Booking**: Real-time availability checking and easy reservation requests.
- **Wishlist & Favorites**: Save your favorite properties for future trips.
- **Direct Messaging**: Built-in chat system to communicate with hosts.
- **Multi-language Support**: Fully localized in English and French.

### For Hosts
- **Professional Dashboard**: Track performance, manage reservations, and view analytics.
- **Listing Editor**: Step-by-step tools to create and manage property details, pricing, and amenities.
- **Availability Calendar**: Manage dates, block periods, and sync availability.
- **Media Management**: Integrated photo and video upload system with S3 storage.
- **Reservation Management**: Easily approve or decline booking requests with custom message templates.

### Security & Tech
- **Modern Auth**: Secure JWT-based authentication and WebAuthn support for passwordless login.
- **High Performance**: Rust backend for fast API responses and efficient resource usage.
- **Responsive Design**: Optimized for all devices using Tailwind CSS and Shadcn UI.

## 🛠️ Technologies Used

### Frontend
- **Framework**: [React](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **State Management**: [React Query](https://tanstack.com/query)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Internationalization**: [i18next](https://www.i18next.com/)

### Backend
- **Language**: [Rust](https://www.rust-lang.org/)
- **Framework**: [Actix Web](https://actix.rs/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [SQLx](https://github.com/launchbadge/sqlx)
- **Caching**: [Moka](https://github.com/moka-rs/moka)
- **Storage**: AWS S3 (or compatible) for media uploads
- **Authentication**: JWT & WebAuthn

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [PostgreSQL](https://www.postgresql.org/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/kamer-pro.git
   cd kamer-pro
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   # Copy .env.example and fill in your DATABASE_URL and S3 credentials
   cp .env.example .env
   cargo run
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📁 Project Structure
```
.
├── backend/         # Rust Actix Web backend
│   ├── src/         # API routes, middleware, and logic
│   ├── migrations/  # Database migrations
│   └── ...
├── frontend/        # React TypeScript frontend
│   ├── src/         # Components, pages, and hooks
│   ├── public/      # Static assets
│   └── ...
└── README.md
```

## 📄 License
This project is licensed under the MIT License.
