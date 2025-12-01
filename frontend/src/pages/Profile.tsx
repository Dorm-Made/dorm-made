import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/home/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/use-profile";
import { useProfilePhoto } from "@/hooks/use-profile-photo";
import { useToast } from "@/hooks/use-toast";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import {
  GraduationCap,
  User as UserIcon,
  ArrowLeft,
  Edit2,
  Save,
  X,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasShownStripeToast = useRef(false);
  const { toast } = useToast();

  const {
    user,
    loading,
    isEditing,
    editingUser,
    saving,
    setIsEditing,
    updateEditingUser,
    handleSave: saveProfile,
    handleCancel,
    isOwnProfile,
  } = useProfile(userId);

  const { uploadingPhoto, fileInputRef, handleFileSelect, handleUploadPhoto } = useProfilePhoto(
    (updatedUser) => {
      updateEditingUser(updatedUser);
    },
  );

  useEffect(() => {
    const stripeParam = searchParams.get("stripe");

    if (stripeParam === "complete" && !hasShownStripeToast.current) {
      hasShownStripeToast.current = true;

      toast({
        title: "Stripe Onboarding Complete!",
        description: "Your payment account has been connected. Checking status...",
        className: "bg-green-500 text-white border-green-600",
        duration: 3000,
      });

      const tabParam = searchParams.get("tab");
      if (tabParam) {
        setSearchParams({ tab: tabParam });
      } else {
        setSearchParams({});
      }
    }
  }, [searchParams, setSearchParams, toast]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelectWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e);
    const file = e.target.files?.[0];
    if (file && userId) {
      handleUploadPhoto(file, userId);
    }
  };

  const handleSaveWrapper = async () => {
    if (userId) {
      await saveProfile(userId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">User not found</h2>
            <p className="text-muted-foreground mb-4">
              The profile you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Profile Card */}
          <Card className="mb-6">
            <CardContent className="p-4 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center lg:items-start">
                  <div className="relative">
                    <Avatar className="h-24 w-24 lg:h-32 lg:w-32 border-4 border-background shadow-lg">
                      {editingUser?.profile_picture ? (
                        <AvatarImage src={editingUser.profile_picture} alt={user.name} />
                      ) : null}
                      <AvatarFallback className="text-2xl lg:text-3xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleFileSelectWrapper}
                      ref={fileInputRef}
                      className="hidden"
                      id="profile-photo-upload"
                      disabled={uploadingPhoto}
                    />
                    {isOwnProfile() && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="absolute bottom-0 right-0 h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-background border-2 border-card shadow-lg flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-50"
                        aria-label="Upload photo"
                      >
                        {uploadingPhoto ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : (
                          <Upload className="h-4 w-4 text-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Info Section*/}
                <div className="flex-1 space-y-3 lg:space-y-4 w-full">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <h1 className="text-2xl lg:text-4xl font-bold text-center lg:text-left">
                      {user.name}
                    </h1>

                    {/* Action Buttons*/}
                    {isOwnProfile() && (
                      <div className="flex gap-2 w-full lg:w-auto lg:ml-4">
                        {!isEditing ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingPhoto}
                              className="flex-1 lg:flex-initial"
                            >
                              <ImageIcon className="h-4 w-4 lg:mr-2" />
                              <span className="inline">
                                {uploadingPhoto ? "Uploading..." : "Photo"}
                              </span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditing(true)}
                              className="flex-1 lg:flex-initial"
                            >
                              <Edit2 className="h-4 w-4 lg:mr-2" />
                              <span className="inline">Edit</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancel}
                              disabled={saving}
                              className="flex-1 lg:flex-initial"
                            >
                              <X className="h-4 w-4 lg:mr-2" />
                              <span className="inline">Cancel</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveWrapper}
                              disabled={saving}
                              className="flex-1 lg:flex-initial"
                            >
                              <Save className="h-4 w-4 lg:mr-2" />
                              <span className="inline">{saving ? "Saving..." : "Save"}</span>
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* University*/}
                  {!isEditing && user.university && (
                    <div className="flex items-center justify-center lg:justify-start text-base lg:text-lg text-muted-foreground">
                      <GraduationCap className="h-4 w-4 lg:h-5 lg:w-5 mr-2 flex-shrink-0" />
                      <span>{user.university}</span>
                    </div>
                  )}

                  {/* Edit Mode or View Mode */}
                  {isEditing ? (
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label htmlFor="university" className="flex items-center mb-2 text-sm">
                          <GraduationCap className="h-4 w-4 mr-2" />
                          University
                        </Label>
                        <Input
                          id="university"
                          value={editingUser?.university || ""}
                          onChange={(e) => updateEditingUser({ university: e.target.value })}
                          placeholder="Enter your university"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description" className="flex items-center mb-2 text-sm">
                          <UserIcon className="h-4 w-4 mr-2" />
                          About you
                        </Label>
                        <Textarea
                          id="description"
                          value={editingUser?.description || ""}
                          onChange={(e) => updateEditingUser({ description: e.target.value })}
                          placeholder="Tell us about yourself..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      <div>
                        <Label htmlFor="profile_picture" className="mb-2 text-sm">
                          Profile Photo URL
                        </Label>
                        <Input
                          id="profile_picture"
                          value={editingUser?.profile_picture || ""}
                          onChange={(e) => updateEditingUser({ profile_picture: e.target.value })}
                          placeholder="https://example.com/photo.jpg"
                          type="url"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Paste your profile photo URL
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {user.description && (
                        <div className="space-y-2 pt-2 lg:pt-4">
                          <div className="flex items-center text-sm font-medium text-muted-foreground">
                            <UserIcon className="h-4 w-4 mr-2" />
                            About
                          </div>
                          <p className="text-sm lg:text-base text-foreground leading-relaxed">
                            {user.description}
                          </p>
                        </div>
                      )}
                      {!user.description && isOwnProfile() && (
                        <p className="text-sm text-muted-foreground italic text-center lg:text-left pt-2">
                          No description yet. Click "Edit" to add one.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Card className="mb-6">
            <CardContent className="p-4 lg:p-6">
              <ProfileTabs
                userId={userId || ""}
                isOwnProfile={isOwnProfile()}
                userName={user.name}
                defaultTab={searchParams.get("tab") || "events"}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
