import { Calendar, Filter, Search } from "lucide-react"

import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Checkbox } from "@/ui/checkbox"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select"
import { Separator } from "@/ui/separator"

import { DatePickerWithRange } from "./date-picker"

type FilterCardProps = {} & React.ComponentProps<typeof Card>

const categories = ["Prothom Alo", "Daily Star", "Bangladesh Pratidin"]

const FilterCard = ({ className }: FilterCardProps) => (
  <Card className={cn("max-w-sm", className)}>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-2xl">
        <Filter />
        Filters
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4.5 -translate-y-1/2 transform text-muted-foreground"></Search>
          <Input placeholder="Search..." className="pl-10" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sort By</Label>
        <div className="flex gap-2">
          <Select value="time">
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>

          <Select value="asc">
            <SelectTrigger className="w-22">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Asc</SelectItem>
              <SelectItem value="desc">Desc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />
      <div className="space-y-3">
        <Label>Newspapers</Label>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat} className="flex space-x-2">
              <Checkbox />
              <Label className="font-normal">{cat}</Label>
            </div>
          ))}
        </div>
      </div>
      <Separator />

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Calendar className="size-4" />
          Date Range
        </Label>
        <DatePickerWithRange date={undefined} />
      </div>
    </CardContent>
  </Card>
)

export default FilterCard
export type { FilterCardProps }
