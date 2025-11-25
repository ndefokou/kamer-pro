import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8082";

const AdminLogin = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/admin/login`, {
                username: formData.username,
                password: formData.password,
            });

            // Store admin token and info
            localStorage.setItem("adminToken", response.data.token);
            localStorage.setItem("adminId", response.data.admin_id.toString());
            localStorage.setItem("adminUsername", response.data.username);

            toast({
                title: "Success",
                description: "Admin login successful",
            });

            navigate("/admin/dashboard");
        } catch (error) {
            let errorMessage = "Login failed";
            if (axios.isAxiosError(error) && error.response) {
                errorMessage = error.response.data.message || error.message;
            }
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
            <Card className="w-full max-w-md shadow-elevated">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary p-4 rounded-full">
                            <Shield className="h-10 w-10 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Admin Login</CardTitle>
                    <CardDescription>
                        Sign in to manage architect profiles
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="Enter admin username"
                                required
                                autoComplete="username"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Enter password"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminLogin;
