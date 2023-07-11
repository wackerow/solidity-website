import {
  Grid,
  type GridProps,
  Text,
  Divider,
  useBreakpointValue,
} from '@chakra-ui/react'
import { Fragment } from 'react'

interface ContributingCard {
  title: string
  description: string
}
const cards: ContributingCard[] = [
  {
    title: 'Reporting issues',
    description:
      'Debugging and reporting issues on Solidity is a great way to learn and interact with the language',
  },
  {
    title: 'Translating the documentation',
    description:
      'Translating is a key factor that helps developers from all corners of the world to be able to access and learn Solidity',
  },
  {
    title: 'Fixing and responding to issues',
    description:
      'Contributing to discussion around issues and submitting fixes is a great way to learn more about the language',
  },
  {
    title: 'Getting involved in the Solidity forum',
    description:
      'The forum is where discussion around the future of Solidity and roadmap planning happen, be a part of it!',
  },
]
export const ContributingCards: React.FC<GridProps> = (props) => {
  return (
    <Grid
      templateColumns={{
        base: '1fr',
        md: 'repeat(2, 1fr)',
        lg: 'repeat(4, 1fr)',
      }}
      columnGap={8}
      {...props}
    >
      {cards.map(({ title, description }, i) => {
        const gridColumn = {
          base: `1 / 2`,
          md: `${(i % 2) + 1} / ${(i % 2) + 2}`,
          lg: `${(i % 4) + 1} / ${(i % 4) + 2}`,
        }
        const getGridRow = (i: number, n: number) => ({
          base: 'auto',
          md: `${Math.floor(i / 2) * 3 + n}`,
          lg: `${Math.floor(i / 4) * 3 + n}`,
        })
        return (
          <Fragment key={title}>
            <Text
              textStyle="h6-mono"
              color="secondary"
              gridColumn={gridColumn}
              gridRow={getGridRow(i, 1)}
              alignSelf="end"
            >
              {title}
            </Text>
            <Divider
              borderColor="highlight"
              gridColumn={gridColumn}
              gridRow={getGridRow(i, 2)}
            />
            <Text
              gridColumn={gridColumn}
              gridRow={getGridRow(i, 3)}
              mt={4}
              mb={{ base: '12 !important', lg: '4 !important' }}
              sx={{
                '&:last-of-type': {
                  mb: '0 !important',
                },
              }}
            >
              {description}
            </Text>
          </Fragment>
        )
      })}
    </Grid>
  )
}
