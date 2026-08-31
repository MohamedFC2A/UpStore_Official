import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get('title') || "UpStore — World's Lowest-Priced Digital Marketplace";
    const category = searchParams.get('category')?.toUpperCase() || 'PREMIUM DIGITAL ACCOUNTS';
    const price = searchParams.get('price');
    const marketPrice = searchParams.get('marketPrice');
    const badge = searchParams.get('badge') || 'INSTANT AUTOMATED DELIVERY';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#030308',
            backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(0, 255, 102, 0.08) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(0, 255, 102, 0.04) 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            padding: '60px 70px',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          {/* Glowing Cyber Accent Lines */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '5px',
              background: 'linear-gradient(90deg, transparent, #00ff66, #00e5ff, transparent)',
            }}
          />

          {/* Background Ambient Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '450px',
              height: '450px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 255, 102, 0.18) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          {/* Top Row: Brand & Category Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            {/* Logo & Brand Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(0, 255, 102, 0.12)',
                  border: '2px solid rgba(0, 255, 102, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00ff66',
                  fontSize: '22px',
                  fontWeight: 900,
                  boxShadow: '0 0 25px rgba(0, 255, 102, 0.3)',
                }}
              >
                UP
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    color: '#ffffff',
                    fontSize: '32px',
                    fontWeight: 900,
                    letterSpacing: '-0.5px',
                  }}
                >
                  Up<span style={{ color: '#00ff66' }}>Store</span>
                </span>
                <span
                  style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '14px',
                    letterSpacing: '2px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  upstore.one
                </span>
              </div>
            </div>

            {/* Category Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '10px 22px',
                borderRadius: '999px',
                color: '#00ff66',
                fontSize: '15px',
                fontWeight: 800,
                letterSpacing: '1px',
              }}
            >
              {category}
            </div>
          </div>

          {/* Center: Main Title & Features */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginTop: '20px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#00ff66',
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              {badge}
            </div>

            <div
              style={{
                color: '#ffffff',
                fontSize: title.length > 50 ? '42px' : '52px',
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: '-1px',
                maxWidth: '950px',
                textShadow: '0 4px 20px rgba(0,0,0,0.8)',
              }}
            >
              {title}
            </div>
          </div>

          {/* Bottom Bar: Pricing & Trust Signals */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              backgroundColor: 'rgba(10, 15, 25, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '24px 34px',
              borderRadius: '24px',
            }}
          >
            {/* Price Box */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              {price && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: 600 }}>From:</span>
                  <span
                    style={{
                      color: '#00ff66',
                      fontSize: '44px',
                      fontWeight: 900,
                      letterSpacing: '-1px',
                      textShadow: '0 0 20px rgba(0, 255, 102, 0.4)',
                    }}
                  >
                    ${price}
                  </span>
                </div>
              )}
              {marketPrice && (
                <span
                  style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '22px',
                    textDecoration: 'line-through',
                    fontWeight: 600,
                  }}
                >
                  ${marketPrice}
                </span>
              )}
              {!price && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#00ff66', fontSize: '24px', fontWeight: 900 }}>UP TO 90% DISCOUNT</span>
                </div>
              )}
            </div>

            {/* Trust Signals */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: 800 }}>4.9/5 Rating</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 800,
                  backgroundColor: 'rgba(0, 255, 102, 0.15)',
                  border: '1px solid rgba(0, 255, 102, 0.4)',
                  padding: '8px 18px',
                  borderRadius: '12px',
                }}
              >
                <span>30-Day Gold Warranty</span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG Image generation error:', e);
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}
