import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Placeholder = ({ 
  title, 
  description = "This feature is coming soon! We're working hard to bring you the best experience.",
  icon: Icon = Construction 
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-paywaka-100 rounded-full flex items-center justify-center">
              <Icon className="h-8 w-8 text-paywaka-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </Button>
            <Button 
              className="bg-paywaka-500 hover:bg-paywaka-600"
              onClick={() => {
                // This would typically open a feedback form
                alert('Thank you for your interest! We\'ll notify you when this feature is available.');
              }}
            >
              Get Notified
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Want to help us prioritize features? Contact support to share your feedback!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Placeholder;
