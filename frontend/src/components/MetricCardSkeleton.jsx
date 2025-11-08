import { Card, CardContent, CardHeader } from '@/components/ui/card'

const MetricCardSkeleton = ({ count = 4 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-8 w-20 bg-gray-200 rounded"></div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-gray-200 rounded"></div>
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

export default MetricCardSkeleton