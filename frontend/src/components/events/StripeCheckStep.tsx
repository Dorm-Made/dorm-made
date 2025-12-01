import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStripeConnect } from "@/hooks/use-stripe-connect";
import { CreditCard, CheckCircle2, Loader2 } from "lucide-react";

export default function StripeCheckStep() {
  const navigate = useNavigate();
  const { canAcceptPayments, loading } = useStripeConnect();

  const handleGoToProfile = () => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      const user = JSON.parse(currentUser);
      navigate(`/profile/${user.id}?tab=payments`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Checking payment setup...</p>
        </CardContent>
      </Card>
    );
  }

  if (canAcceptPayments) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="p-4 rounded-full bg-green-50 mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-600">Payment setup complete!</p>
          <p className="text-sm text-muted-foreground mt-2">You can now create events and receive payments.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="p-4 rounded-full bg-primary/10 inline-block mb-4">
            <CreditCard className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Setup Required</h2>
          <p className="text-muted-foreground">
            To create events and receive payments, connect your Stripe account through your profile's Payments section.
          </p>
        </div>

        <Button
          onClick={handleGoToProfile}
          size="lg"
          className="w-full"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Connect Stripe
        </Button>
      </CardContent>
    </Card>
  );
}