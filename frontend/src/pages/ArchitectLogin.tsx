import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2 } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8082";

const ArchitectLogin = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        firmName: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/architect/login`, {
                firm_name: formData.firmName,
                password: formData.password,
            });

            // Store architect token and info
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("architectId", response.data.architect_id.toString());
            localStorage.setItem("firmName", response.data.firm_name);
            localStorage.setItem("role", "architect");

            toast({
                title: "Success",
                description: `Welcome back, ${response.data.firm_name}!`,
            });

            navigate("/architect-company");
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
                        <div className="bg-blue-500 p-4 rounded-full">
                            <Building2 className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Architect Login</CardTitle>
                    <CardDescription>
                        Sign in with your firm name and password
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="firmName">Firm Name</Label>
                            <Input
                                id="firmName"
                                type="text"
                                value={formData.firmName}
                                onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                                placeholder="Enter your firm name"
                                required
                                autoComplete="organization"
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

                        <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>

                        <p className="text-sm text-center text-muted-foreground mt-4">
                            Don't have an account? Contact the administrator.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ArchitectLogin;
