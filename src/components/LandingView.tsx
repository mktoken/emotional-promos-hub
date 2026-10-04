import HomeHero from "@/components/home/HomeHero";
import HomeCategories from "@/components/home/HomeCategories";
import HomeSolutions from "@/components/home/HomeSolutions";
import HomeProcess from "@/components/home/HomeProcess";
import HomeTrust from "@/components/home/HomeTrust";
import HomeFaq from "@/components/home/HomeFaq";
import HomeFinalCta from "@/components/home/HomeFinalCta";

interface LandingViewProps {
  onViewChange: (view: string) => void;
}

export default function LandingView({ onViewChange }: LandingViewProps) {
  const exploreCatalog = () => onViewChange("catalog");
  const tellProject = () => onViewChange("brief");
  return (
    <>
      <HomeHero onExploreCatalog={exploreCatalog} onTellProject={tellProject} />
      <HomeCategories />
      <HomeSolutions onTellProject={tellProject} />
      <HomeProcess />
      <HomeTrust />
      <HomeFaq />
      <HomeFinalCta onExploreCatalog={exploreCatalog} onTellProject={tellProject} />
    </>
  );
}
