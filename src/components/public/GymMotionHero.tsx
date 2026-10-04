const SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1800&q=80",
    alt: "Free weights on a gym floor",
  },
  {
    src: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=80",
    alt: "Members training with dumbbells",
  },
  {
    src: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1800&q=80",
    alt: "Row of treadmills in a gym",
  },
  {
    src: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1800&q=80",
    alt: "Cable machines and gym interior",
  },
];

export function GymMotionHero({ className = "" }: { className?: string }) {
  return (
    <div className={`gym-motion-hero ${className}`.trim()} aria-hidden="true">
      {SLIDES.map((slide, index) => (
        <img key={slide.src} src={slide.src} alt={slide.alt} className={`gym-motion-slide gym-motion-slide-${index + 1}`} />
      ))}
      <div className="gym-motion-shade" />
    </div>
  );
}
