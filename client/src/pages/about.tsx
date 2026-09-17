import { Navbar } from "@/components/layout-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ShieldCheck, Zap, Users, Award, Phone, MapPin, Mail } from "lucide-react";
import bachanImage from "@assets/bachan-724x1024_1770900662694.jpg";

export default function AboutPage() {
  const values = [
    {
      icon: ShieldCheck,
      title: "Safety",
      description:
        "The safety of our customers, employees, and communities is our top priority. We adhere to the highest standards of safety in all aspects of our operations, ensuring that every product and service meets stringent safety regulations and guidelines.",
    },
    {
      icon: Award,
      title: "Quality",
      description:
        "We are committed to delivering products of the highest quality, crafted with precision and care to exceed industry standards and customer expectations. Quality is not just a goal but a fundamental principle that guides everything we do.",
    },
    {
      icon: Zap,
      title: "Reliability",
      description:
        "Customers trust us to deliver on our promises, and we take that trust seriously. With a focus on reliability and consistency, we strive to be a dependable partner that customers can rely on for their gas cylinder needs, day in and day out.",
    },
    {
      icon: Users,
      title: "Customer Satisfaction",
      description:
        "Our success is measured by the satisfaction of our customers. We listen attentively to their needs, respond promptly to their inquiries, and go above and beyond to ensure their complete satisfaction with every interaction.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="relative py-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-10 right-20 w-80 h-80 bg-primary/15 rounded-full blur-[100px] opacity-50" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[80px] opacity-30" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4" data-testid="text-about-title">
              About <span className="text-primary">Bachan Gas Service</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your premier destination for reliable and efficient gas cylinder distribution solutions.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-1 rounded-md bg-gradient-to-br from-primary/40 to-primary/10 blur-sm" />
                <img
                  src={bachanImage}
                  alt="Manjit Singh - Founder, Bachan Gas Service"
                  className="relative rounded-md w-full max-w-sm object-cover shadow-2xl"
                  data-testid="img-founder"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">Welcome to Bachan Gas Service</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to Bachan Gas Service, your premier destination for reliable and efficient gas cylinder distribution solutions. With a commitment to excellence and a passion for customer satisfaction, we have emerged as a trusted name in the industry, serving both commercial and residential clients with a comprehensive range of high-quality gas cylinders and related services.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-white font-medium" data-testid="text-contact-phone">9814343443</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">Bachan Gas Service, Punjab, India</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-4">
                "Wishing you a Prosperous year ahead and look forward to new partnerships for achieving new Milestones together."
              </p>
              <p className="text-white font-semibold">
                &mdash; Manjit Singh, <span className="text-primary">Founder</span>
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-20">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-primary mb-3">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  At Bachan Gas Service, our mission is simple yet profound: to provide safe, dependable, and cost-effective gas cylinder solutions that meet the diverse needs of our customers. We strive to exceed expectations by delivering superior products, unparalleled service, and unwavering integrity in every interaction.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-primary mb-3">Our Vision</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Driven by a vision of excellence, innovation, and sustainability, we aspire to be the leading provider of gas cylinder distribution services in our region. We envision a future where clean and efficient energy is accessible to all, and we are dedicated to playing a pivotal role in realizing this vision through our products and practices.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white text-center mb-10">Our Values</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value) => (
                <Card key={value.title} className="bg-white/5 border-white/10">
                  <CardContent className="p-6 text-center">
                    <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">{value.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white text-center mb-4">Our Products and Services</h2>
            <p className="text-muted-foreground text-center max-w-3xl mx-auto leading-relaxed mb-6">
              Bachan Gas Service offers a diverse portfolio of gas cylinders tailored to meet the unique requirements of both commercial and residential customers. From standard propane and butane cylinders for household use to specialized cylinders for industrial applications, we have the right solution for every need.
            </p>
            <p className="text-muted-foreground text-center max-w-3xl mx-auto leading-relaxed">
              Our comprehensive range of services includes prompt delivery, cylinder exchange programs, safety inspections, and expert advice to help customers make informed decisions about their gas cylinder usage.
            </p>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Get in Touch</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Experience the Bachan Gas Service difference today and discover why we are the preferred choice for gas cylinder distribution solutions. Contact us to learn more about our products and services or to place an order with our friendly and knowledgeable team.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  Get Started
                </Button>
              </Link>
              <a href="tel:9814343443">
                <Button size="lg" variant="outline" className="rounded-full border-white/20 text-white">
                  <Phone className="mr-2 h-4 w-4" />
                  Call Us: 9814343443
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
