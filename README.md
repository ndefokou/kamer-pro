# Kamer-Pro E-Commerce Platform

Kamer-Pro is a modern, full-stack e-commerce platform designed to provide a seamless and feature-rich online shopping experience. The project is built with a powerful and scalable architecture, featuring a React frontend and a high-performance Rust backend.

## Key Features

- **Product Management**: Effortlessly create, update, and manage products.
- **User Authentication**: Secure user registration and login with JWT-based authentication.
- **Product Reviews and Ratings**: Allow users to leave reviews and ratings for products.
- **Shopping Cart**: A fully functional shopping cart for a smooth checkout process.
- **Wishlist**: Users can save their favorite products to a wishlist for future purchase.
- **Seller Dashboard**: A dedicated dashboard for sellers to manage their products and view sales analytics.
- **Internationalization**: Support for multiple languages to cater to a global audience.

## Technologies Used

### Frontend

- **Framework**: [React](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Shadcn UI](https://ui.shadcn.com/)
- **Routing**: [React Router](https://reactrouter.com/)
- **State Management**: [React Query](https://tanstack.com/query/v4)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation
- **API Communication**: [Axios](https://axios-http.com/)
- **Internationalization**: [i18next](https://www.i18next.com/)

### Backend

- **Framework**: [Actix Web](https://actix.rs/)
- **Language**: [Rust](https://www.rust-lang.org/)
- **Database**: [SQLite](https://www.sqlite.org/index.html) with [SQLx](https://github.com/launchbadge/sqlx)
- **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/) and [bcrypt](https://github.com/pyca/bcrypt/) for password hashing
- **File Uploads**: Handled with `actix-multipart`
- **CORS**: Managed with `actix-cors`

## Getting Started

To get the project up and running on your local machine, follow these steps.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable version)
- [SQLite](https://www.sqlite.org/download.html)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/kamer-pro.git
    cd kamer-pro
    ```

2.  **Set up the backend**:
    ```bash
    cd backend
    cargo build
    cargo run
    ```

3.  **Set up the frontend**:
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```

## Available Scripts

### Frontend

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run lint`: Lints the codebase for errors.
-   `npm run preview`: Previews the production build locally.

### Backend

-   `cargo run`: Compiles and runs the backend server.
-   `cargo build`: Compiles the backend code.
-   `cargo test`: Runs the backend tests.

## Project Structure

```
.
├── backend/         # Rust backend source code
│   ├── src/
│   ├── Cargo.toml
│   └── ...
├── frontend/        # React frontend source code
│   ├── src/
│   ├── package.json
│   └── ...
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.