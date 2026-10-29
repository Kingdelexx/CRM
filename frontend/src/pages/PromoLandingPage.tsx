import { useState, useEffect } from 'react'
import {
  Package,
  Plane,
  Truck,
  Clock,
  Gift,
  Calendar,
  CheckCircle2,
  Phone,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Calculator,
  ArrowRight
} from 'lucide-react'
import WhatsAppIcon from '@/components/WhatsAppIcon'

// Promo Details
const PROMO_END_DATE = new Date('2026-11-02T23:59:59+01:00').getTime()
const WHATSAPP_NUMBER_DISPLAY = '+234 806 756 7457'
const WHATSAPP_NUMBER_RAW = '2348067567457'
const TEL_LINK = 'tel:+2348067567457'

export default function PromoLandingPage() {
  const [weight, setWeight] = useState<number>(25)
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    ended: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: false })

  // Set page title for ads SEO & social sharing
  useEffect(() => {
    document.title = 'Nigeria to UK Shipping Promo - £3.50/kg | Mintana Logistics'
  }, [])

  // Live Countdown Timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const diff = PROMO_END_DATE - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true })
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((diff / (1000 * 60)) % 60)
        const seconds = Math.floor((diff / 1000) % 60)
        setTimeLeft({ days, hours, minutes, seconds, ended: false })
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calculate rate
  const isPromoEligible = weight >= 25
  const estimatedCost = isPromoEligible ? (weight * 3.5).toFixed(2) : '—'

  // Pre-filled WhatsApp URLs
  const defaultWhatsAppText = encodeURIComponent(
    'Hello Mintana Logistics! I saw your Nigeria to UK Shipping Promo (£3.50/kg with FREE UK doorstep delivery). I would like to get started with shipping my items.'
  )
  const defaultWhatsAppUrl = `https://wa.me/${WHATSAPP_NUMBER_RAW}?text=${defaultWhatsAppText}`

  const quoteWhatsAppText = encodeURIComponent(
    `Hello Mintana Logistics! I want to take advantage of the £3.50/kg Promo for my ${weight}kg package from Nigeria to the UK. Please guide me on booking and drop-off/pickup.`
  )
  const quoteWhatsAppUrl = `https://wa.me/${WHATSAPP_NUMBER_RAW}?text=${quoteWhatsAppText}`

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white pb-24 md:pb-12">
      {/* Top Urgency Header Bar */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white text-xs sm:text-sm font-semibold py-2 px-4 text-center shadow-md flex items-center justify-center gap-2">
        <span className="inline-block animate-pulse">🔥</span>
        <span>LIMITED-TIME AIR FREIGHT SPECIAL: 26TH OCT – 2ND NOV 2026</span>
        <span className="hidden sm:inline">| ZERO UK DELIVERY FEES!</span>
      </div>

      {/* Standalone Brand Navigation (No CRM Links) */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/mintana-logo.jpg"
              alt="Mintana Logistics Logo"
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover border border-slate-700/60 shadow-md"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-white">
                  MINTANA
                </span>
                <span className="text-xs font-bold text-sky-400 uppercase tracking-widest bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/50">
                  Logistics
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xs:block">
                Bringing Nigeria Closer to the UK 💙
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={TEL_LINK}
              className="hidden md:inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>{WHATSAPP_NUMBER_DISPLAY}</span>
            </a>
            <a
              href={defaultWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
            >
              <WhatsAppIcon className="w-4 h-4 fill-slate-950" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/90 p-6 sm:p-12 shadow-2xl">
          {/* Subtle Glow Background Elements */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 top-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Promo Badge */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              NIGERIA TO UK SHIPPING PROMO 🇬🇧
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs sm:text-sm font-semibold">
              <Plane className="w-3.5 h-3.5" />
              Express Air Freight
            </span>
          </div>

          {/* Main Headline */}
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none">
              BIG SAVINGS.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                FAST DELIVERY.
              </span>{' '}
              ZERO DELIVERY FEES!
            </h1>

            <p className="text-lg sm:text-2xl font-semibold text-slate-200">
              Your favourite UK shipping deal is here! ✈️📦
            </p>

            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Ship more and save more with Mintana Logistics. Experience seamless air cargo from Nigeria straight to any UK address.
            </p>
          </div>

          {/* Standout Pricing Hero Card */}
          <div className="mt-8 sm:mt-10 max-w-2xl mx-auto">
            <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/10 text-center">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-xs uppercase px-4 py-1 rounded-full shadow-md tracking-wider">
                Special Rate
              </div>

              <div className="space-y-2 mt-2">
                <div className="text-slate-400 text-xs sm:text-sm uppercase font-bold tracking-wider">
                  Limited-Time Promotional Price
                </div>
                <div className="text-4xl sm:text-6xl font-black text-white flex items-center justify-center gap-2">
                  <span className="text-emerald-400">JUST £3.50</span>
                  <span className="text-xl sm:text-2xl text-slate-300 font-bold">/ KG!</span>
                </div>
                <p className="text-base sm:text-lg font-semibold text-emerald-300">
                  For packages weighing 25kg and above
                </p>
              </div>

              {/* Bullet Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-left border-t border-slate-700/60 pt-6">
                <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      🎁 FREE DOORSTEP DELIVERY
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Delivered straight to any UK doorstep at £0 extra fee!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      ⚡ FAST 2–4 WORKING DAYS
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Swift dispatch and rapid UK arrival with end-to-end handling.
                    </p>
                  </div>
                </div>
              </div>

              {/* Promo Urgency Banner with Countdown */}
              <div className="mt-6 bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">PROMO DURATION</span>
                    <span className="text-sm font-bold text-amber-300">
                      📅 26th October – 2nd November 2026
                    </span>
                  </div>
                </div>

                {/* Live Countdown Display */}
                <div className="flex items-center gap-2 text-center">
                  <div className="bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg min-w-[50px]">
                    <div className="text-base font-black text-white">{timeLeft.days}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Days</div>
                  </div>
                  <span className="text-slate-600 font-bold">:</span>
                  <div className="bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg min-w-[50px]">
                    <div className="text-base font-black text-white">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Hours</div>
                  </div>
                  <span className="text-slate-600 font-bold">:</span>
                  <div className="bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg min-w-[50px]">
                    <div className="text-base font-black text-white">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Mins</div>
                  </div>
                  <span className="text-slate-600 font-bold">:</span>
                  <div className="bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg min-w-[50px]">
                    <div className="text-base font-black text-emerald-400">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Secs</div>
                  </div>
                </div>
              </div>

              {/* Main Primary WhatsApp CTA Button */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={defaultWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base sm:text-lg px-8 py-4 rounded-xl shadow-xl shadow-emerald-500/20 transition-all transform active:scale-95 group cursor-pointer"
                >
                  <WhatsAppIcon className="w-6 h-6 fill-slate-950 group-hover:scale-110 transition-transform" />
                  <span>CLAIM PROMO ON WHATSAPP</span>
                  <ChevronRight className="w-5 h-5 ml-1" />
                </a>

                <a
                  href={TEL_LINK}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm sm:text-base px-6 py-4 rounded-xl border border-slate-700 transition-colors"
                >
                  <Phone className="w-4 h-4 text-sky-400" />
                  <span>Call: {WHATSAPP_NUMBER_DISPLAY}</span>
                </a>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                💬 Instant response on WhatsApp • No hidden charges • 100% Guaranteed Safe Delivery
              </p>
            </div>
          </div>
        </section>

        {/* Quick Instant Cost Calculator (Pure Client-side, leads to WhatsApp) */}
        <section className="mt-12 sm:mt-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          <div className="max-w-2xl mx-auto text-center space-y-2 mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <Calculator className="w-3.5 h-3.5" />
              <span>Instant Promo Price Estimator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              See How Much You Save
            </h2>
            <p className="text-sm text-slate-400">
              Enter your estimated package weight to calculate the promotional shipping total.
            </p>
          </div>

          <div className="max-w-xl mx-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-200">
                  Package Weight (KG)
                </label>
                <div className="text-sm font-extrabold text-emerald-400">
                  {weight} kg
                </div>
              </div>

              {/* Slider & Number Input */}
              <div className="space-y-3">
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="1"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Quick select:</span>
                  {[25, 30, 45, 60, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => setWeight(val)}
                      type="button"
                      className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                        weight === val
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {val}kg
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Shipping Rate:</span>
                <span className="font-semibold text-white">
                  {isPromoEligible ? '£3.50 / kg (PROMO RATE)' : 'Requires min. 25kg for promo'}
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>UK Doorstep Delivery:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" /> FREE (£0.00)
                </span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
                <div>
                  <span className="text-base font-bold text-white block">Estimated Total:</span>
                  <span className="text-xs text-slate-500">Zero hidden surcharges</span>
                </div>
                <div className="text-right">
                  {isPromoEligible ? (
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      £{estimatedCost}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-400">
                      Add {25 - weight}kg more to unlock £3.50/kg!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Direct CTA button to WhatsApp with the calculated weight */}
            <a
              href={quoteWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
            >
              <WhatsAppIcon className="w-5 h-5 fill-slate-950" />
              <span>Book {weight}kg via WhatsApp Now</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </a>
          </div>
        </section>

        {/* Benefits & Value Proposition Section */}
        <section className="mt-12 sm:mt-16">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Why Ship with Mintana Logistics?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Don’t miss this limited-time offer! Whether you’re shipping for business or sending parcels to loved ones, we’ve got you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Zero Delivery Fees</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Enjoy 100% free doorstep delivery across mainland UK. No unexpected last-mile driver fees or hidden collection costs.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">2–4 Working Days Delivery</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Speed is our hallmark. Direct air cargo schedules ensure your goods arrive quickly and securely at their UK destination.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Safe & Fully Tracked</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                From drop-off in Nigeria through customs processing to recipient delivery, your shipment is tracked and fully monitored.
              </p>
            </div>
          </div>
        </section>

        {/* Suitable For (Commercial & Personal) */}
        <section className="mt-12 sm:mt-16 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Commercial & Personal Shipping
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Whether for Business or Loved Ones, We’ve Got You Covered
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Take advantage of the £3.50/kg special rate for bulk inventory or family care packages.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-200">
                    <strong className="text-white">Business Invoicing & Wholesale:</strong> Ideal for fashion brands, cosmetics, and bulk stock sellers.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-200">
                    <strong className="text-white">African Foodstuffs & Ingredients:</strong> Carefully handled, packaged, and preserved for flight.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-200">
                    <strong className="text-white">Personal & Family Care Packages:</strong> Send gifts and essentials to family members across the UK.
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-400" />
                How Simple Is It To Ship?
              </h3>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    <strong>Message Us on WhatsApp:</strong> Send your approximate package weight and item list.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    <strong>Drop-off or Pickup:</strong> Drop your package at our hub or request doorstep collection in Nigeria.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    <strong>Direct UK Delivery:</strong> Package arrives safely at the recipient’s UK doorstep in 2–4 working days!
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={defaultWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm py-3 px-4 rounded-xl shadow transition"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-slate-950" />
                  <span>Start on WhatsApp Now</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="mt-12 sm:mt-16">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Got Questions?
            </h2>
            <p className="text-sm text-slate-400">
              Quick answers about the Nigeria to UK Shipping Promo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                Is UK doorstep delivery completely free?
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Yes! Under this promotion, there are zero additional delivery fees once your package lands in the UK. We deliver directly to the recipient’s address.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                What is the minimum weight requirement?
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The promotional rate of £3.50/kg applies to packages weighing 25kg and above. For smaller packages below 25kg, reach out to us on WhatsApp for standard competitive rates.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                How long will delivery take?
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transit time is fast: between 2 to 4 working days from the flight dispatch date.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                Until when is this promo valid?
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The promo period runs from 26th October through 2nd November 2026. Be sure to book your shipment before the deadline!
              </p>
            </div>
          </div>
        </section>

        {/* Final Conversion Call To Action */}
        <section className="mt-12 sm:mt-16 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold">
              ⚡ OFFER ENDS 2ND NOVEMBER 2026
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              READY TO SHIP? LET’S GET STARTED!
            </h2>

            <p className="text-base sm:text-lg text-slate-300 font-medium">
              Don’t miss this limited-time offer. Ship your 25kg+ parcels to the UK at just £3.50/kg with 100% free doorstep delivery!
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={defaultWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg px-8 py-4 rounded-xl shadow-xl shadow-emerald-500/30 transition-all transform active:scale-95"
              >
                <WhatsAppIcon className="w-6 h-6 fill-slate-950" />
                <span>📲 WhatsApp: {WHATSAPP_NUMBER_DISPLAY}</span>
              </a>

              <a
                href={TEL_LINK}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-base px-6 py-4 rounded-xl border border-slate-700 transition"
              >
                <Phone className="w-5 h-5 text-sky-400" />
                <span>Call Directly</span>
              </a>
            </div>

            <div className="pt-6 border-t border-slate-800/80">
              <p className="text-sm font-semibold text-sky-400">
                Mintana Logistics — Bringing Nigeria Closer to the UK. 💙
              </p>
            </div>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="mt-12 py-8 text-center text-xs text-slate-500 border-t border-slate-900">
          <p>© {new Date().getFullYear()} Mintana Logistics. All rights reserved.</p>
          <p className="mt-1 text-slate-600">
            Terms & Conditions apply. Standard prohibited air cargo regulations strictly observed.
          </p>
        </footer>
      </main>

      {/* Floating Bottom Sticky Bar for Mobile Conversion */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 p-3 shadow-2xl flex items-center gap-2">
        <a
          href={TEL_LINK}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl border border-slate-700 flex items-center justify-center shrink-0"
          title="Call Us"
        >
          <Phone className="w-5 h-5" />
        </a>
        <a
          href={defaultWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 active:bg-emerald-600 text-slate-950 font-black text-sm py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/30"
        >
          <WhatsAppIcon className="w-5 h-5 fill-slate-950" />
          <span>Chat on WhatsApp (£3.50/kg)</span>
        </a>
      </div>
    </div>
  )
}
