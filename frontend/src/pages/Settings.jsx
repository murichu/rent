import { useState } from 'react'
import { Shield, Bell, User, Palette, Key, Globe } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'language', label: 'Language', icon: Globe },
  ]

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input placeholder="+254 700 000000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Input placeholder="Property Management Co." />
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password regularly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Password</label>
            <Input type="password" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input type="password" />
          </div>
          <Button>Update Password</Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">2FA Status</p>
              <p className="text-sm text-muted-foreground">
                {twoFactorEnabled ? 'Two-factor authentication is enabled' : 'Two-factor authentication is disabled'}
              </p>
            </div>
            <Badge variant={twoFactorEnabled ? 'default' : 'secondary'}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <Button 
            variant={twoFactorEnabled ? 'destructive' : 'default'}
            onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
          >
            <Key className="mr-2 h-4 w-4" />
            {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
          {twoFactorEnabled && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Backup Codes</p>
              <p className="text-sm text-muted-foreground">
                Save these codes in a safe place. You can use them to access your account if you lose your device.
              </p>
              <Button variant="outline" size="sm">
                Generate New Codes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium">Current Session</p>
                <p className="text-sm text-muted-foreground">Windows • Chrome • Nairobi, Kenya</p>
              </div>
              <Badge>Active</Badge>
            </div>
            <Button variant="outline">Logout All Other Sessions</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderNotificationSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose what notifications you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { title: 'Email Notifications', description: 'Receive notifications via email' },
          { title: 'SMS Notifications', description: 'Receive notifications via SMS' },
          { title: 'Payment Reminders', description: 'Get notified about upcoming payments' },
          { title: 'Lease Expiry Alerts', description: 'Get notified when leases are expiring' },
          { title: 'Maintenance Requests', description: 'Get notified about new maintenance requests' },
          { title: 'New Tenant Registration', description: 'Get notified when new tenants register' },
        ].map((item) => (
          <div key={item.title} className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <input type="checkbox" className="h-4 w-4" defaultChecked />
          </div>
        ))}
        <Button>Save Preferences</Button>
      </CardContent>
    </Card>
  )

  const renderAppearanceSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how the app looks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Theme</label>
          <div className="grid grid-cols-3 gap-4">
            {['Light', 'Dark', 'System'].map((theme) => (
              <div
                key={theme}
                className="cursor-pointer rounded-lg border p-4 text-center hover:border-primary"
              >
                <p className="font-medium">{theme}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Accent Color</label>
          <div className="flex gap-2">
            {['blue', 'green', 'purple', 'orange', 'red'].map((color) => (
              <div
                key={color}
                className={`h-10 w-10 rounded-full cursor-pointer bg-${color}-600`}
              />
            ))}
          </div>
        </div>
        <Button>Apply Changes</Button>
      </CardContent>
    </Card>
  )

  const renderLanguageSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Language & Region</CardTitle>
        <CardDescription>Set your preferred language and region</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Language</label>
          <select className="w-full rounded-md border p-2">
            <option>English</option>
            <option>Kiswahili</option>
            <option>Français</option>
            <option>Español</option>
            <option>Português</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Currency</label>
          <select className="w-full rounded-md border p-2">
            <option>KES - Kenyan Shilling</option>
            <option>USD - US Dollar</option>
            <option>EUR - Euro</option>
            <option>GBP - British Pound</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date Format</label>
          <select className="w-full rounded-md border p-2">
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>
        <Button>Save Settings</Button>
      </CardContent>
    </Card>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings()
      case 'security':
        return renderSecuritySettings()
      case 'notifications':
        return renderNotificationSettings()
      case 'appearance':
        return renderAppearanceSettings()
      case 'language':
        return renderLanguageSettings()
      default:
        return renderProfileSettings()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex gap-6">
        <aside className="w-64 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </aside>

        <div className="flex-1">{renderContent()}</div>
      </div>
    </div>
  )
}

export default Settings
