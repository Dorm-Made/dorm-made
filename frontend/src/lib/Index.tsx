import { Header } from "@/components/layout/Header";
import { HeroSection } from "@/components/home/HeroSection";
import { Footer } from "@/components/home/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        <HeroSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
