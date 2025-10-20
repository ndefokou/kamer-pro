import { useCart } from "@/hooks/useCart";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Cart = () => {
  const { t } = useTranslation();
  const { cartItems, updateCartItem, removeFromCart, clearCart, getCartTotal, isLoading } = useCart();

  const handleQuantityChange = (id: number, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity > 0) {
      updateCartItem(id, newQuantity);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
    }).format(price);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t("your cart is empty")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("add items to your cart to see them here")}
              </p>
              <Link to="/marketplace">
                <Button>{t("continue shopping")}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold">{t("shopping cart")}</h1>
          <Button variant="outline" onClick={clearCart} disabled={isLoading}>
            {t("clear cart")}
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-full sm:w-24 h-auto sm:h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <Link to={`/product/${item.product_id}`}>
                        <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                          {item.product_name}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.product_location}</p>
                      <p className="text-lg font-bold text-primary mt-2">
                        {formatPrice(item.product_price)}
                      </p>
                      {item.product_status !== 'active' && (
                        <p className="text-sm text-destructive mt-1">
                          {t("not available")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start sm:items-end justify-between mt-4 sm:mt-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                        disabled={isLoading}
                        className="self-end"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                          disabled={isLoading || item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value > 0) {
                              updateCartItem(item.id, value);
                            }
                          }}
                          className="w-16 text-center"
                          disabled={isLoading}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                          disabled={isLoading}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm font-semibold mt-2 self-end">
                        {t("subtotal")}: {formatPrice(item.product_price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="md:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>{t("order summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>{t("subtotal")}</span>
                  <span className="font-semibold">{formatPrice(getCartTotal())}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t("items in cart")}</span>
                  <span>{cartItems.length}</span>
                </div>
                <div className="border-t pt-4 flex justify-between text-lg font-bold">
                  <span>{t("total")}</span>
                  <span className="text-primary">{formatPrice(getCartTotal())}</span>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button className="w-full" size="lg">
                  {t("proceed to checkout")}
                </Button>
                <Link to="/marketplace" className="w-full">
                  <Button variant="outline" className="w-full">
                    {t("continue shopping")}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
