import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, shoppingBag, TrendingUp, MapPin } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-primary-foreground py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-secondary p-4 rounded-full">
              <Store className="h-16 w-16 text-secondary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Welcome to KamerLink
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-95">
            The premier marketplace connecting buyers and sellers in Yaoundé,
            Cameroon
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/webauth-login">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Get Started
              </Button>
            </Link>
            <Link to="/webauth-login">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20"
              >
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Why Choose KamerLink?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-gradient-card shadow-soft">
              <div className="flex justify-center mb-4">
                <div className="bg-primary p-3 rounded-full">
                  <shoppingBag className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3">Easy Buying</h3>
              <p className="text-muted-foreground">
                Browse thousands of products from local sellers. Find exactly
                what you need with our powerful search and filters.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-gradient-card shadow-soft">
              <div className="flex justify-center mb-4">
                <div className="bg-secondary p-3 rounded-full">
                  <TrendingUp className="h-8 w-8 text-secondary-foreground" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3">Grow Your Business</h3>
              <p className="text-muted-foreground">
                Reach more customers by listing your products. Simple dashboard
                to manage your inventory and sales.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-gradient-card shadow-soft">
              <div className="flex justify-center mb-4">
                <div className="bg-accent p-3 rounded-full">
                  <MapPin className="h-8 w-8 text-accent-foreground" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3">Local Focus</h3>
              <p className="text-muted-foreground">
                Connect with buyers and sellers in your area. Support local
                businesses and find deals near you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start?
          </h2>
          <p className="text-xl mb-8 opacity-95">
            Join KamerLink today and discover the best local marketplace in
            Yaoundé
          </p>
          <Link to="/webauth-login">
            <Button size="lg" variant="secondary">
              Sign Up Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Store className="h-8 w-8" />
          </div>
          <p className="text-sm">© 2025 KamerLink. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
