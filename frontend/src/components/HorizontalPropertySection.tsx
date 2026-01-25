import { ReactNode } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";

interface HorizontalPropertySectionProps {
    title: string;
    children: ReactNode;
}

const HorizontalPropertySection = ({
    title,
    children,
}: HorizontalPropertySectionProps) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
            const newScrollLeft =
                scrollContainerRef.current.scrollLeft +
                (direction === "left" ? -scrollAmount : scrollAmount);

            scrollContainerRef.current.scrollTo({
                left: newScrollLeft,
                behavior: "smooth",
            });
        }
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    // Check arrows on mount and resize
    useEffect(() => {
        handleScroll();
        window.addEventListener("resize", handleScroll);
        return () => window.removeEventListener("resize", handleScroll);
    }, []);

    return (
        <div className="mb-12 relative group">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6 px-4 md:px-0">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {title}
                </h2>
            </div>

            {/* Scroll Container */}
            <div className="relative group/slider">
                {/* Left Arrow */}
                {showLeftArrow && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => scroll("left")}
                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 h-10 w-10 rounded-full bg-white border border-gray-200 shadow-elevated hover:scale-105 transition-all opacity-0 group-hover/slider:opacity-100"
                    >
                        <ChevronLeft className="h-5 w-5 text-foreground" />
                    </Button>
                )}

                {/* Right Arrow */}
                {showRightArrow && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => scroll("right")}
                        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 h-10 w-10 rounded-full bg-white border border-gray-200 shadow-elevated hover:scale-105 transition-all opacity-0 group-hover/slider:opacity-100"
                    >
                        <ChevronRight className="h-5 w-5 text-foreground" />
                    </Button>
                )}

                {/* Properties Container */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4 px-4 md:px-0 -mx-4 md:mx-0"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};

export default HorizontalPropertySection;
