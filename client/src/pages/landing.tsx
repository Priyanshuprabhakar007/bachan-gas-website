import { useState } from "react";
import { Navbar } from "@/components/layout-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, ShieldCheck, Clock, Phone, ArrowRight, IndianRupee, Package, Layers, Play } from "lucide-react";
import type { Category, Product, SiteSettings } from "@shared/schema";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function VideoSection({ settings }: { settings: SiteSettings | undefined }) {
  if (!settings?.showHomeVideo || !settings?.homeVideoUrl) return null;

  const videoId = extractYouTubeId(settings.homeVideoUrl);
  if (!videoId) return null;

  const title = settings.homeVideoTitle || "See Us in Action";

  return (
    <section className="py-20 border-t border-white/5" data-testid="video-section">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Play className="h-3 w-3 mr-1.5" />
            Video
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" data-testid="text-video-title">
            {title}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 shadow-2xl shadow-primary/5">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                data-testid="video-embed"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ProductCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Skeleton className="aspect-[4/3] rounded-t-lg" />
        <div className="p-5 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </CardContent>
    </Card>
  );
}

function MasterCatalog() {
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const { data: categories, isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allProducts, isLoading: prodsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const activeCatId = activeTab ?? categories?.[0]?.id ?? null;

  const filteredProducts = allProducts?.filter(p => {
    if (!activeCatId) return p.isActive !== false && p.status === "ACTIVE";
    return p.categoryId === activeCatId && p.isActive !== false && p.status === "ACTIVE";
  }) || [];

  if (catsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-28 rounded-full" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="master-catalog">
      <div className="flex flex-wrap gap-3" data-testid="category-tabs">
        <button
          onClick={() => setActiveTab(null)}
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
            activeCatId === null
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-white/5 text-muted-foreground border border-white/10 hover-elevate"
          }`}
          data-testid="tab-all"
        >
          <Layers className="inline h-4 w-4 -mt-0.5" />
          All Products
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeCatId === cat.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-white/5 text-muted-foreground border border-white/10 hover-elevate"
            }`}
            data-testid={`tab-category-${cat.id}`}
          >
            {cat.iconImageUrl ? (
              <img
                src={cat.iconImageUrl}
                alt=""
                className="w-5 h-5 rounded-full object-cover"
                data-testid={`img-category-icon-${cat.id}`}
              />
            ) : cat.icon ? (
              <span>{cat.icon}</span>
            ) : null}
            {cat.name}
          </button>
        ))}
      </div>

      {prodsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground" data-testid="text-no-products">No products in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product, idx) => {
            const category = categories?.find(c => c.id === product.categoryId);
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <Link href={`/product/${product.id}`}>
                  <Card
                    className="group cursor-pointer hover-elevate border-white/5 transition-colors hover:border-primary/20"
                    data-testid={`card-product-${product.id}`}
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-t-lg" data-testid={`img-area-${product.id}`}>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                          data-testid={`img-product-${product.id}`}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors" data-testid={`text-product-name-${product.id}`}>
                            {product.name}
                          </h3>
                          {category && (
                            <Badge variant="secondary" className="text-xs">
                              {category.icon} {category.name}
                            </Badge>
                          )}
                        </div>
                        {product.weight && (
                          <Badge variant="outline" className="shrink-0 text-xs border-white/10">
                            {product.weight} {product.unit || "KG"}
                          </Badge>
                        )}
                      </div>

                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-4 w-4 text-primary" />
                          <span className="text-xl font-bold text-foreground" data-testid={`text-price-${product.id}`}>
                            {product.price}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={product.inStock !== false ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}
                        >
                          {product.inStock !== false ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="text-center pt-2">
        <Link href="/products">
          <Button variant="outline" className="rounded-full border-white/10" data-testid="button-view-all-products">
            View All Products <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30" data-testid="landing-page">
      <Navbar />
      
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-[100px] opacity-50" />
          <div className="absolute bottom-0 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] opacity-30" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-muted-foreground">Trusted by 20,000+ households and leading commercial & industrial customers</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
              Fueling Your Life <br />
              <span className="text-gradient">Safely & Efficiently</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Experience seamless LPG cylinder booking and delivery management. 
              Safe, reliable, and always on time for your home and business needs.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="rounded-full" data-testid="button-get-connection">
                  Get Started
                </Button>
              </Link>
              <Link href="/products">
                <Button size="lg" variant="outline" className="rounded-full border-white/10" data-testid="button-book-refill">
                  Browse Products
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-card/30 border-t border-white/5">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Master Catalog
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Products</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Browse our complete range of LPG cylinders and safety equipment for domestic and commercial use.
            </p>
          </motion.div>

          <MasterCatalog />
        </div>
      </section>

      <section className="py-20 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: "Safety First", desc: "Rigorous quality checks and safety protocols for every cylinder." },
              { icon: Clock, title: "On-Time Delivery", desc: "Track your order in real-time. We value your time." },
              { icon: Phone, title: "24/7 Support", desc: "Dedicated customer support team ready to assist you anytime." },
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className="glass-card p-8 rounded-2xl text-left hover:border-primary/30 transition-colors group"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <VideoSection settings={siteSettings} />

      <section className="py-24 bg-card/30 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary/20 to-orange-900/10 border border-primary/20 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <Flame className="w-64 h-64 text-primary" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 relative z-10">Ready to simplify your gas booking?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto relative z-10">
              Join thousands of satisfied customers who trust Bachan Gas for their daily fuel needs.
            </p>
            <Link href="/login">
               <Button size="lg" className="relative z-10 bg-white text-background font-bold px-8" data-testid="button-cta-register">
                 Get Started Now
               </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-white/10 bg-background">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-primary" />
            <span className="font-bold text-white text-lg">Bachan Gas Agency</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Bachan Gas Agency. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
