import { ReactNode } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

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
            const scrollAmount = 400;
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

    return (
        <div className="mb-12 relative group">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                    {title}
                    <ChevronRight className="h-5 w-5" />
                </h2>
            </div>

            {/* Scroll Container */}
            <div className="relative">
                {/* Left Arrow */}
                {showLeftArrow && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => scroll("left")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white border border-gray-300 shadow-md hover:shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}

                {/* Right Arrow */}
                {showRightArrow && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => scroll("right")}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white border border-gray-300 shadow-md hover:shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}

                {/* Properties Container */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};

export default HorizontalPropertySection;
