import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/home/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateMealForm } from "@/hooks/use-create-meal-form";
import { useImageUpload } from "@/hooks/use-image-upload";
import { ImageAdjuster } from "@/components/shared/ImageAdjuster";
import { LIMITS, charCount } from "@/lib/limits";
import { ChefHat, Crop, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreateMeal = () => {
  const navigate = useNavigate();
  const { formData, updateFormData, loading, submitMeal } = useCreateMealForm();
  const {
    selectedImage,
    imagePreview,
    rawPreview,
    rawFileName,
    needsAdjust,
    handleImageChange,
    applyAdjustedImage,
    reAdjust,
    handleRemoveImage,
  } = useImageUpload();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMeal(selectedImage);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create a New Meal</h1>
            <p className="text-muted-foreground">
              Share your culinary creation with fellow students
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Meal Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChefHat className="mr-2 h-5 w-5" />
                  Meal Details
                </CardTitle>
                <CardDescription>Tell us about your meal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  {/* Meal Name */}
                  <div>
                    <Label htmlFor="name">Meal Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Classic Margherita Pizza"
                      maxLength={LIMITS.MEAL_NAME}
                      required
                    />
                  </div>

                  {/* Meal Description */}
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe your meal, cooking method, and what makes it special..."
                      rows={4}
                      maxLength={LIMITS.MEAL_DESCRIPTION}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {charCount(formData.description, LIMITS.MEAL_DESCRIPTION)}
                    </p>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <Label htmlFor="ingredients">Ingredients</Label>
                    <Textarea
                      id="ingredients"
                      name="ingredients"
                      value={formData.ingredients}
                      onChange={handleInputChange}
                      placeholder="List all ingredients"
                      maxLength={LIMITS.MEAL_INGREDIENTS}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {charCount(formData.ingredients, LIMITS.MEAL_INGREDIENTS)}
                    </p>
                  </div>

                  {/* Meal Image Upload */}
                  <div>
                    <Label htmlFor="meal-image">Meal Image (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload an image of your meal (Max 5MB, JPEG/PNG/WebP)
                    </p>

                    {!imagePreview ? (
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground transition-colors">
                        <Input
                          id="meal-image"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <label htmlFor="meal-image" className="cursor-pointer">
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                          <p className="text-sm font-medium text-foreground mb-1">
                            Click to upload meal image
                          </p>
                          <p className="text-xs text-muted-foreground">
                            JPEG, PNG or WebP (max. 5MB)
                          </p>
                        </label>
                      </div>
                    ) : needsAdjust && rawPreview ? (
                      <ImageAdjuster
                        src={rawPreview}
                        aspect={16 / 9}
                        fileName={rawFileName || "meal.jpg"}
                        onApply={applyAdjustedImage}
                        onCancel={handleRemoveImage}
                      />
                    ) : (
                      <div className="relative rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Meal preview"
                          className="w-full aspect-video object-cover rounded-lg"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={reAdjust}
                            aria-label="Adjust image"
                          >
                            <Crop className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={handleRemoveImage}
                            aria-label="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating Meal..." : "Create Meal"}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateMeal;
