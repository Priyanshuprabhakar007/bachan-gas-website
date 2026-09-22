import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, IndianRupee, Package, ArrowRight, Flame } from "lucide-react";
import type { Category, Product } from "@shared/schema";

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

export default function ProductsListingPage() {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allProducts, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const products = useMemo(() => {
    let filtered = allProducts?.filter(p => {
      const matchesCategory = activeCategory === null || p.categoryId === activeCategory;
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      const isActive = p.isActive !== false && p.status === "ACTIVE";
      return matchesCategory && matchesSearch && isActive;
    }) || [];
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "price-asc": return parseInt(a.price) - parseInt(b.price);
        case "price-desc": return parseInt(b.price) - parseInt(a.price);
        default: return 0;
      }
    });
  }, [allProducts, activeCategory, searchQuery, sortBy]);

  const selectedCategory = categories?.find(c => c.id === activeCategory);

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="products-listing-page">
      <Navbar />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">All Products</h1>
          <p className="text-muted-foreground">Browse our complete catalog of LPG products and safety equipment</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-products"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px]" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 text-muted-foreground border border-white/10 hover-elevate"
              }`}
              data-testid="filter-all"
            >
              All
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 text-muted-foreground border border-white/10 hover-elevate"
                }`}
                data-testid={`filter-category-${cat.id}`}
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
        </div>

        {selectedCategory?.bannerImageUrl && (
          <div className="aspect-[3/1] rounded-lg overflow-hidden mb-6 relative" data-testid="category-banner">
            <img
              src={selectedCategory.bannerImageUrl}
              alt={selectedCategory.name}
              className="object-cover w-full h-full"
              data-testid="img-category-banner"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
              <h2 className="text-2xl font-bold text-white p-6" data-testid="text-category-banner-name">
                {selectedCategory.name}
              </h2>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}><CardContent className="p-0">
                <Skeleton className="aspect-[4/3] rounded-t-lg" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent></Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2" data-testid="text-no-results">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => {
              const category = categories?.find(c => c.id === product.categoryId);
              return (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <Card
                    className="group cursor-pointer hover-elevate border-white/5 h-full transition-colors hover:border-primary/20"
                    data-testid={`card-product-${product.id}`}
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-t-lg" data-testid={`img-area-${product.id}`}>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                          data-testid={`img-product-${product.id}`}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5 flex flex-col flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors" data-testid={`text-product-name-${product.id}`}>
                          {product.name}
                        </h3>
                        {product.weight && (
                          <Badge variant="outline" className="shrink-0 text-xs border-white/10">
                            {product.weight} {product.unit || "KG"}
                          </Badge>
                        )}
                      </div>

                      {category && (
                        <Badge variant="secondary" className="w-fit text-xs">
                          {category.icon} {category.name}
                        </Badge>
                      )}

                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{product.description}</p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-4 w-4 text-primary" />
                          <span className="text-lg font-bold text-foreground" data-testid={`text-price-${product.id}`}>
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
              );
            })}
          </div>
        )}
      </div>

      <footer className="py-8 border-t border-white/10 bg-background">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-primary" />
            <span className="font-bold text-white">Bachan Gas Agency</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Bachan Gas Agency. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
