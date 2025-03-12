import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './lib/supabase';

interface Coupon {
  id: string;
  code: string;
  description: string;
  is_claimed: boolean;
}

function App() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [nextClaimTime, setNextClaimTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons();
    checkLastClaim();
  }, []);

  useEffect(() => {
    if (nextClaimTime) {
      const interval = setInterval(() => {
        updateTimeLeft();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [nextClaimTime]);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      toast.error('Failed to load coupons');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLastClaim = async () => {
    const { data: recentClaims } = await supabase
      .from('claims')
      .select('claimed_at')
      .order('claimed_at', { ascending: false })
      .limit(1);

    if (recentClaims && recentClaims.length > 0) {
      const lastClaim = new Date(recentClaims[0].claimed_at);
      const nextAvailable = lastClaim.getTime() + 60 * 60 * 1000; // 1 hour cooldown
      setNextClaimTime(nextAvailable);
    }
  };

  const updateTimeLeft = () => {
    if (!nextClaimTime) return;
    const now = Date.now();
    const diff = nextClaimTime - now;

    if (diff <= 0) {
      setTimeLeft(null);
      setNextClaimTime(null);
      return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setTimeLeft(`${minutes}m ${seconds}s`);
  };

  const claimCoupon = async () => {
    if (claiming) return;

    try {
      setClaiming(true);
      const availableCoupon = coupons.find((c) => !c.is_claimed);

      if (!availableCoupon) {
        toast.error('No coupons available');
        return;
      }

      const { data: recentClaims } = await supabase
        .from('claims')
        .select('claimed_at')
        .order('claimed_at', { ascending: false })
        .limit(1);

      if (recentClaims && recentClaims.length > 0) {
        const lastClaim = new Date(recentClaims[0].claimed_at);
        const hoursSinceLastClaim = (Date.now() - lastClaim.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastClaim < 1) {
          const nextAvailable = lastClaim.getTime() + 60 * 60 * 1000;
          setNextClaimTime(nextAvailable);
          updateTimeLeft();
          toast.error('Please wait 1 hour between claims');
          return;
        }
      }

      let browserId = localStorage.getItem('browser_id');
      if (!browserId) {
        browserId = crypto.randomUUID();
        localStorage.setItem('browser_id', browserId);
      }

      const { error: updateError } = await supabase
        .from('coupons')
        .update({ is_claimed: true })
        .eq('id', availableCoupon.id);

      if (updateError) throw updateError;

      const { error: claimError } = await supabase
        .from('claims')
        .insert([
          {
            coupon_id: availableCoupon.id,
            browser_id: browserId,
            ip_address: 'client-ip',
          },
        ]);

      if (claimError) throw claimError;

      toast.success(`Claimed coupon: ${availableCoupon.code}`);
      fetchCoupons();
      checkLastClaim();
    } catch (error) {
      toast.error('Failed to claim coupon');
      console.error('Error:', error);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Coupon Distribution System
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get exclusive discounts! Each user can claim one coupon per hour.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600 text-lg">Loading coupons...</p>
              </div>
            ) : coupons.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-600 text-lg">No coupons available</p>
              </div>
            ) : (
              coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`rounded-lg border p-6 ${
                    coupon.is_claimed
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-gray-200 hover:border-blue-500 transition-colors'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {coupon.code}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        {coupon.description}
                      </p>
                    </div>
                    {coupon.is_claimed && (
                      <span className="flex-shrink-0 inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        Claimed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={claimCoupon}
              disabled={claiming || loading || timeLeft !== null}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm ${
                claiming || loading || timeLeft
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {claiming ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Claiming...
                </>
              ) : timeLeft ? (
                `Wait ${timeLeft}`
              ) : (
                'Claim Next Available Coupon'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

