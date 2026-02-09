import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return <DefaultErrorFallback error={this.state.error} resetError={() => this.setState({ hasError: false })} />;
        }

        return this.props.children;
    }
}

const DefaultErrorFallback = ({ error, resetError }: { error?: Error, resetError: () => void }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                <p className="text-gray-600 mb-8 max-h-32 overflow-y-auto">
                    {error?.message || "An unexpected error occurred. We've been notified and are working on a fix."}
                </p>
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => window.location.reload()}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 rounded-xl font-bold"
                    >
                        Reload Page
                    </Button>
                    <Button
                        onClick={resetError}
                        variant="outline"
                        className="w-full py-6 rounded-xl font-bold"
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const RouteErrorElement = () => {
    const error = useRouteError();
    const navigate = useNavigate();

    let errorMessage = "An unexpected error occurred.";

    if (isRouteErrorResponse(error)) {
        errorMessage = error.statusText || errorMessage;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
                <p className="text-gray-600 mb-8">
                    {errorMessage}
                </p>
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => navigate("/")}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 rounded-xl font-bold"
                    >
                        Go Home
                    </Button>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="w-full py-6 rounded-xl font-bold"
                    >
                        Reload
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ErrorBoundary;
