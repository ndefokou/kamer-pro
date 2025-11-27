import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, ShoppingBag, TrendingUp, MapPin, Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Animated Gradient */}
      <section className="relative bg-gradient-hero-animated text-primary-foreground py-24 md:py-32 px-4 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto text-center relative z-10">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <img
                src="/logo.jpg"
                alt="MboaMaison Logo"
                className="h-32 w-32 md:h-40 md:w-40 object-contain float drop-shadow-2xl"
              />
              <div className="absolute -inset-2 bg-white/20 rounded-full blur-xl -z-10 animate-pulse-slow"></div>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 font-heading tracking-tight">
            Welcome to{" "}
            <span className="inline-block">
              MboaMaison
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-95 font-light leading-relaxed">
            The premier marketplace connecting buyers and sellers in Yaoundé,
            Cameroon
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/webauth-login">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-elevated hover:shadow-strong transition-all duration-300 hover:scale-105 px-8 py-6 text-lg font-semibold"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm text-white shadow-soft hover:shadow-elevated transition-all duration-300 hover:scale-105 px-8 py-6 text-lg font-semibold"
              >
                <Store className="mr-2 h-5 w-5" />
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-heading">
              Why Choose{" "}
              <span className="gradient-text">MboaMaison</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the future of local marketplace trading
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature Card 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl"></div>
              <div className="relative p-8 rounded-2xl bg-gradient-card hover:bg-gradient-card-hover border border-border shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-2">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="bg-gradient-primary p-4 rounded-2xl shadow-soft group-hover:shadow-glow transition-all duration-300 group-hover:scale-110">
                      <ShoppingBag className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4 font-heading text-center">Easy Buying</h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Browse thousands of products from local sellers. Find exactly
                  what you need with our powerful search and filters.
                </p>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-secondary rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl"></div>
              <div className="relative p-8 rounded-2xl bg-gradient-card hover:bg-gradient-card-hover border border-border shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-2">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="bg-gradient-secondary p-4 rounded-2xl shadow-soft group-hover:shadow-glow transition-all duration-300 group-hover:scale-110">
                      <TrendingUp className="h-8 w-8 text-secondary-foreground" />
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4 font-heading text-center">Grow Your Business</h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Reach more customers by listing your products. Simple dashboard
                  to manage your inventory and sales.
                </p>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-accent rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl"></div>
              <div className="relative p-8 rounded-2xl bg-gradient-card hover:bg-gradient-card-hover border border-border shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-2">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="bg-gradient-accent p-4 rounded-2xl shadow-soft group-hover:shadow-glow transition-all duration-300 group-hover:scale-110">
                      <MapPin className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4 font-heading text-center">Local Focus</h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Connect with buyers and sellers in your area. Support local
                  businesses and find deals near you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-primary text-primary-foreground py-20 md:py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-20 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading">
            Ready to Start?
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-95 max-w-2xl mx-auto font-light">
            Join MboaMaison today and discover the best local marketplace in
            Yaoundé
          </p>
          <Link to="/webauth-login">
            <Button
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-elevated hover:shadow-strong transition-all duration-300 hover:scale-105 px-8 py-6 text-lg font-semibold"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Sign Up Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-6">
            <img
              src="/logo.jpg"
              alt="MboaMaison Logo"
              className="h-16 w-16 object-contain opacity-90"
            />
          </div>
          <p className="text-sm opacity-80">
            © 2025 MboaMaison. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

